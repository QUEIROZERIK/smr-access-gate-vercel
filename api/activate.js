import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // API Key (GPT Actions)
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["X-API-Key"] ||
      (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");

    if (!process.env.SMR_API_KEY) {
      return res.status(500).json({ ok: false, error: "Server misconfigured", message: "Missing SMR_API_KEY" });
    }
    if (!apiKey || apiKey !== process.env.SMR_API_KEY) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const purchase_code = String(body?.purchase_code || "").trim();
    const device_id = String(body?.device_id || "").trim();

    if (!purchase_code || !device_id) {
      return res.status(400).json({ ok: false, error: "Missing purchase_code or device_id" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, error: "Supabase env missing" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Licença existe e está ativa?
    const { data: lic, error: licErr } = await supabase
      .from("licenses")
      .select("purchase_code,status,max_devices")
      .eq("purchase_code", purchase_code)
      .maybeSingle();

    if (licErr) return res.status(500).json({ ok: false, error: licErr.message });
    if (!lic) return res.status(404).json({ ok: false, error: "Purchase code not found" });

    const status = String(lic.status || "").toUpperCase();
    if (status !== "ACTIVE") {
      return res.status(403).json({ ok: false, error: "License inactive" });
    }

    const maxDevices = Number(lic.max_devices || 2);

    // 2) Já existe esse device?
    const { data: already, error: aErr } = await supabase
      .from("license_devices")
      .select("id")
      .eq("purchase_code", purchase_code)
      .eq("device_id", device_id)
      .maybeSingle();

    if (aErr) return res.status(500).json({ ok: false, error: aErr.message });
    if (already) {
      // idempotente
      const { data: all, error: allErr } = await supabase
        .from("license_devices")
        .select("id")
        .eq("purchase_code", purchase_code);

      if (allErr) return res.status(500).json({ ok: false, error: allErr.message });

      return res.status(200).json({
        ok: true,
        active: true,
        message: "Device already registered",
        devices_used: (all || []).length,
        max_devices: maxDevices,
      });
    }

    // 3) Quantos devices já existem?
    const { data: devices, error: dErr } = await supabase
      .from("license_devices")
      .select("id")
      .eq("purchase_code", purchase_code);

    if (dErr) return res.status(500).json({ ok: false, error: dErr.message });

    const used = (devices || []).length;
    if (used >= maxDevices) {
      return res.status(409).json({
        ok: false,
        error: "Device limit reached",
        devices_used: used,
        max_devices: maxDevices,
      });
    }

    // 4) Registra novo device
    const { error: insErr } = await supabase
      .from("license_devices")
      .insert({ purchase_code, device_id });

    if (insErr) return res.status(500).json({ ok: false, error: insErr.message });

    return res.status(200).json({
      ok: true,
      active: true,
      message: `Device registered (${used + 1}/${maxDevices})`,
      devices_used: used + 1,
      max_devices: maxDevices,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Internal error", message: e?.message || String(e) });
  }
}
