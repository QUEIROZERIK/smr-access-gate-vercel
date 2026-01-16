// Proxy do endpoint /authorize do Auth0.
// Motivo: o GPT Actions exige que Authorization URL, Token URL e o host da API
// compartilhem o mesmo root domain.

export default async function handler(req, res) {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    return res.end("AUTH0_DOMAIN missing");
  }

  // Encaminha exatamente a querystring que o ChatGPT montar
  const qs = req.url.includes("?") ? req.url.split("?")[1] : "";
  const target = `https://${domain}/authorize${qs ? `?${qs}` : ""}`;

  res.statusCode = 302;
  res.setHeader("Location", target);
  return res.end();
}
