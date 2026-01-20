import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function isValidDeviceId(deviceId) {
  // UUID v4 ou algo semelhante (aceita padrão geral de UUID)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(deviceId || "").trim()
  );
}

function safeNow() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Gate do backend (somente seu GPT chama isso)
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.SMR_API_KEY;

    if (!expectedKey) {
      return res.status(500).json({
        ok: false,
        error: "Server misconfigured",
        message: "Missing SMR_API_KEY env var",
      });
    }

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        ok: false,
        error: "Server misconfigured",
        message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const activation_code = normalizeCode(body?.activation_code);
    const device_id = String(body?.device_id || "").trim();

    if (!activation_code) {
      return res.status(400).json({ ok: false, error: "Missing activation_code" });
    }

    // device_id deve ser estável por “instância” do usuário. Se ainda não tiver, gere no GPT e guarde.
    if (!device_id || !isValidDeviceId(device_id)) {
      return res.status(400).json({ ok: false, error: "Missing/invalid device_id" });
    }

    // Busca licença pelo código
    const { data: lic, error: readErr } = await supabase
      .from("licenses")
      .select("email, status, activation_code, max_devices, devices, device_count, activated_at, updated_at")
      .eq("activation_code", activation_code)
      .maybeSingle();

    if (readErr) return res.status(500).json({ ok: false, error: readErr.message });

    if (!lic) {
      return res.status(404).json({
        ok: false,
        error: "Activation code not found",
      });
    }

    const status = String(lic.status || "").toUpperCase();
    if (status !== "ACTIVE") {
      return res.status(403).json({
        ok: false,
        error: "License inactive",
        status,
      });
    }

    const maxDevices = Number.isFinite(lic.max_devices) ? lic.max_devices : 2;

    const devicesArr = Array.isArray(lic.devices) ? lic.devices : [];
    const now = safeNow();

    // Se já existe o device_id, só atualiza last_seen
    const existingIdx = devicesArr.findIndex((d) => d?.device_id === device_id);
    if (existingIdx >= 0) {
      devicesArr[existingIdx] = {
        ...devicesArr[existingIdx],
        last_seen: now,
      };

      const { error: upErr } = await supabase
        .from("licenses")
        .update({
          devices: devicesArr,
          updated_at: now,
        })
        .eq("activation_code", activation_code);

      if (upErr) return res.status(500).json({ ok: false, error: upErr.message });

      return res.status(200).json({
        ok: true,
        activated: true,
        email: lic.email,
        device_registered: true,
        slots_used: devicesArr.length,
        max_devices: maxDevices,
      });
    }

    // Se ainda não existe, tenta registrar novo dispositivo, respeitando limite
    if (devicesArr.length >= maxDevices) {
      return res.status(409).json({
        ok: false,
        error: "Device limit reached",
        slots_used: devicesArr.length,
        max_devices: maxDevices,
      });
    }

    devicesArr.push({
      device_id,
      first_seen: now,
      last_seen: now,
    });

    const updatePayload = {
      devices: devicesArr,
      device_count: devicesArr.length,
      updated_at: now,
      activated_at: lic.activated_at || now,
    };

    const { error: writeErr } = await supabase
      .from("licenses")
      .update(updatePayload)
      .eq("activation_code", activation_code);

    if (writeErr) return res.status(500).json({ ok: false, error: writeErr.message });

    return res.status(200).json({
      ok: true,
      activated: true,
      email: lic.email,
      device_registered: true,
      slots_used: devicesArr.length,
      max_devices: maxDevices,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Internal error",
      message: e?.message || String(e),
    });
  }
}
