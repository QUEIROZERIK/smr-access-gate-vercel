import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function generateActivationCode() {
  // Código curto, “humano”, mas com boa entropia
  // Ex: SMR-8F3K-29QW-7H2P
  const chunk = () => crypto.randomBytes(2).toString("hex").toUpperCase(); // 4 chars
  return `SMR-${chunk()}-${chunk()}-${chunk()}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Proteção simples por segredo na URL
    const secret = req.query.secret;
    if (!secret || secret !== process.env.HOTMART_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Status e e-mail (tolerante a variações de payload)
    const status =
      body?.data?.purchase?.status ||
      body?.purchase?.status ||
      body?.status ||
      "";

    const email =
      (body?.data?.buyer?.email ||
        body?.buyer?.email ||
        body?.data?.purchase?.buyer?.email ||
        body?.purchase?.buyer?.email ||
        "").toLowerCase();

    // Se não tiver informação mínima, ignora sem quebrar a Hotmart
    if (!email || !status) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const normalized = String(status).toUpperCase();

    // Regra de negócio: aprovado => ACTIVE; demais => INACTIVE
    const activeStatuses = new Set(["APPROVED", "COMPLETE"]);
    const newLicenseStatus = activeStatuses.has(normalized) ? "ACTIVE" : "INACTIVE";

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Supabase env missing" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date().toISOString();

    // 1) Pega licença existente (se houver) para manter activation_code
    const { data: existing, error: readErr } = await supabase
      .from("licenses")
      .select("activation_code")
      .eq("email", email)
      .maybeSingle();

    if (readErr) {
      return res.status(500).json({ error: readErr.message });
    }

    let activationCode = existing?.activation_code || null;

    // 2) Se status é ACTIVE e não tem código, gera e tenta gravar
    if (newLicenseStatus === "ACTIVE" && !activationCode) {
      // tenta algumas vezes em caso raríssimo de colisão no índice unique
      for (let i = 0; i < 5; i++) {
        const candidate = generateActivationCode();
        const { error: upErr } = await supabase
          .from("licenses")
          .upsert(
            {
              email,
              status: newLicenseStatus,
              hotmart_purchase_status: normalized,
              last_event_at: now,
              updated_at: now,
              activation_code: candidate,
              max_devices: 2,
              // não mexe em devices/device_count aqui
            },
            { onConflict: "email" }
          );

        if (!upErr) {
          activationCode = candidate;
          break;
        }

        // colisão de activation_code (índice unique) => tenta outro
        if (String(upErr.message || "").toLowerCase().includes("activation_code")) {
          continue;
        }

        // qualquer outro erro => retorna
        return res.status(500).json({ error: upErr.message });
      }

      if (!activationCode) {
        return res.status(500).json({ error: "Failed to generate unique activation code" });
      }

      return res.status(200).json({ ok: true, email, status: newLicenseStatus, activation_code: activationCode });
    }

    // 3) Se já tem código (ou status não é ACTIVE), atualiza só os campos operacionais
    const { error: writeErr } = await supabase
      .from("licenses")
      .upsert(
        {
          email,
          status: newLicenseStatus,
          hotmart_purchase_status: normalized,
          last_event_at: now,
          updated_at: now,
          // mantém activation_code já existente
          activation_code: activationCode,
        },
        { onConflict: "email" }
      );

    if (writeErr) return res.status(500).json({ error: writeErr.message });

    return res.status(200).json({
      ok: true,
      email,
      status: newLicenseStatus,
      activation_code: activationCode, // pode ser null se ainda não aprovou
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
