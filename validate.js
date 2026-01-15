import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const auth = req.headers.authorization || "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ active: false, status: "NO_TOKEN", message: "Faça login para continuar." });
    }
    const token = auth.split(" ")[1];

    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) return res.status(500).json({ error: "AUTH0_DOMAIN missing" });

    // 1) Busca e-mail do usuário autenticado (Auth0 /userinfo)
    const userinfoResp = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!userinfoResp.ok) {
      return res.status(401).json({ active: false, status: "BAD_TOKEN", message: "Sessão expirada. Faça login novamente." });
    }

    const userinfo = await userinfoResp.json();
    const email = (userinfo.email || "").toLowerCase();
    if (!email) {
      return res.status(400).json({ active: false, status: "NO_EMAIL", message: "Não foi possível identificar seu e-mail." });
    }

    // 2) Consulta licença no Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "Supabase env missing" });

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase
      .from("licenses")
      .select("status")
      .eq("email", email)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const status = data?.status || "INACTIVE";
    const active = status === "ACTIVE";

    return res.status(200).json({
      active,
      email,
      status,
      message: active
        ? "Acesso liberado."
        : "Licença não encontrada ou inativa. Verifique o e-mail da compra ou contate o suporte."
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
