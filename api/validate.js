import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // 1) Gate do backend (GPT Actions)
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

    // 2) Email do comprador (licença por usuário)
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ ok: false, error: "Missing email" });
    }

    // 3) Supabase (service role)
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

    // 4) Busca licença
    const { data, error } = await supabase
      .from("licenses")
      .select("email, status, hotmart_purchase_status, last_event_at, created_at")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const status = String(data?.status || "NOT_FOUND").toUpperCase();
    const active = status === "ACTIVE";

    return res.status(200).json({
      ok: true,
      email,
      active,
      status, // ACTIVE | INACTIVE | NOT_FOUND
      hotmart_purchase_status: data?.hotmart_purchase_status || null,
      last_event_at: data?.last_event_at || null,
      created_at: data?.created_at || null,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Internal error",
      message: e?.message || String(e),
    });
  }
}
