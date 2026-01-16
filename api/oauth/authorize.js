export default async function handler(req, res) {
  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

  if (!AUTH0_DOMAIN) {
    return res.status(500).send("Missing AUTH0_DOMAIN env var");
  }

  // Monta URL final do Auth0 /authorize, reaproveitando TODOS os query params do ChatGPT
  const auth0Authorize = new URL(`https://${AUTH0_DOMAIN}/authorize`);

  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value === "string") auth0Authorize.searchParams.set(key, value);
  }

  // Redireciona o navegador para o Auth0
  res.writeHead(302, { Location: auth0Authorize.toString() });
  res.end();
}
