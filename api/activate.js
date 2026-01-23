import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { purchase_code } = req.body || {};

    if (!purchase_code) {
      return res.status(400).json({ ok: false, error: "Missing purchase_code" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("licenses")
      .select("status")
      .eq("purchase_code", purchase_code.trim())
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "Purchase code not found"
      });
    }

    if (data.status !== "ACTIVE") {
      return res.status(403).json({
        ok: false,
        error: "License inactive"
      });
    }

    return res.status(200).json({
      ok: true,
      active: true,
      message: "License activated successfully"
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Internal error",
      message: String(e)
    });
  }
}
