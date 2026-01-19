import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // 1) API Key
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.SMR_API_KEY) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // 2) Email a validar
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ ok: false, error: "Missing email" });
    }

    // 3) Supabase (service role)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, error: "Supabase env missing" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase
      .from("licenses")
      .select("status, hotmart_purchase_status, last_event_at")
      .eq("email", email)
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const isActive = (data?.status || "").toUpperCase() === "ACTIVE";

    return res.status(200).json({
      ok: true,
      email,
      active: isActive,
      status: data?.status || "NOT_FOUND",
      hotmart_purchase_status: data?.hotmart_purchase_status || null,
      last_event_at: data?.last_event_at || null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Internal error", message: String(e) });
  }
}
