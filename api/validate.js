export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // ✅ API Key via header (Actions manda isso)
const apiKey = req.headers['x-api-key'];

if (!apiKey || apiKey !== process.env.SMR_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}

    // ✅ compara com ENV do Vercel
    if (!process.env.SMR_API_KEY) {
      // Se isso cair, era pra dar 500 mesmo — mas vamos te devolver claro
      return res.status(500).json({
        ok: false,
        error: "Server misconfigured",
        message: "Missing SMR_API_KEY env var",
      });
    }

    if (apiKey !== process.env.SMR_API_KEY) {
      return res.status(403).json({ ok: false, active: false, error: "Invalid API key" });
    }

    return res.status(200).json({ ok: true, active: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Internal error",
      message: e?.message || String(e),
    });
  }
}
