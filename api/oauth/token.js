// Proxy do endpoint /oauth/token do Auth0.
// Motivo: o GPT Actions exige que Authorization URL, Token URL e o host da API
// compartilhem o mesmo root domain.

export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    return res.end("AUTH0_DOMAIN missing");
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("allow", "POST, OPTIONS");
    return res.end("Method Not Allowed");
  }

  const raw = await readRawBody(req);
  const upstreamUrl = `https://${domain}/oauth/token`;

  const upstreamResp = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "content-type": req.headers["content-type"] || "application/x-www-form-urlencoded",
    },
    body: raw,
  });

  const text = await upstreamResp.text();

  res.statusCode = upstreamResp.status;
  res.setHeader("content-type", upstreamResp.headers.get("content-type") || "application/json");
  res.setHeader("cache-control", "no-store");
  return res.end(text);
}
