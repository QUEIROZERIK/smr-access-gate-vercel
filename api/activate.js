import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // API Key (protege a Action)
    const apiKey = req.headers["x-api-key"];
    if (!process.env.SMR_API_KEY) {
      return res.status(500).json({ ok: false, error: "Server misconfigured", message: "Missing SMR_API_KEY env var" });
    }
    if (!apiKey || apiKey !== process.env.SMR_API_KEY) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const activation_code = String(body?.activation_code || "").trim().toUpperCase();
    const device_id = String(body?.device_id || "").trim();

    if (!activation_code || !device_id) {
      return res.status(400).json({ ok: false, error: "Missing parameters", required: ["activation_code", "device_id"] });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, error: "Supabase env missing" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Busca licença pelo código
    const { data: lic, error: qerr } = await supabase
      .from("licenses")
      .select("id, status, max_devices, devices")
      .eq("activation_code", activation_code)
      .maybeSingle();

    if (qerr) return res.status(500).json({ ok: false, error: qerr.message });
    if (!lic) return res.status(404).json({ ok: false, error: "Activation code not found" });

    const status = String(lic.status || "").toUpperCase();
    if (status !== "ACTIVE") {
      return res.status(403).json({ ok: false, error: "License inactive" });
    }

    const maxDevices = Number(lic.max_devices || 2);
    const devices = Array.isArray(lic.devices) ? lic.devices : [];

    // já registrado?
    if (devices.includes(device_id)) {
      return res.status(200).json({ ok: true, activated: true, device_count: devices.length, max_devices: maxDevices });
    }

    // limite atingido?
    if (devices.length >= maxDevices) {
      return res.status(409).json({ ok: false, error: "Device limit reached", device_count: devices.length, max_devices: maxDevices });
    }

    const newDevices = [...devices, device_id];

    const { error: uerr } = await supabase
      .from("licenses")
      .update({ devices: newDevices, last_event_at: new Date().toISOString() })
      .eq("id", lic.id);

    if (uerr) return res.status(500).json({ ok: false, error: uerr.message });

    return res.status(200).json({ ok: true, activated: true, device_count: newDevices.length, max_devices: maxDevices });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Internal error", message: e?.message || String(e) });
  }
}
