import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

    if (!email || !status) return res.status(200).json({ ok: true, ignored: true });

    const normalized = String(status).toUpperCase();

    // Regra de negócio: aprovado => ACTIVE; demais => INACTIVE
    const activeStatuses = new Set(["APPROVED", "COMPLETE"]);
    const newLicenseStatus = activeStatuses.has(normalized) ? "ACTIVE" : "INACTIVE";

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "Supabase env missing" });

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("licenses")
      .upsert({
        email,
        status: newLicenseStatus,
        hotmart_purchase_status: normalized,
        last_event_at: now
      });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
