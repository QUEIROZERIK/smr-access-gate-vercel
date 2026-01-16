function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
  if (!AUTH0_DOMAIN) {
    return res.status(500).json({ error: "missing_env", message: "Missing AUTH0_DOMAIN" });
  }

  const raw = await parseBody(req);
  const contentType = (req.headers["content-type"] || "").toLowerCase();

  // ChatGPT geralmente manda form-urlencoded; mas aceitamos JSON também
  let bodyParams = new URLSearchParams();
  try {
    if (contentType.includes("application/json")) {
      const json = JSON.parse(raw || "{}");
      for (const [k, v] of Object.entries(json)) {
        if (v !== undefined && v !== null) bodyParams.set(k, String(v));
      }
    } else {
      // default: x-www-form-urlencoded
      bodyParams = new URLSearchParams(raw);
    }
  } catch (e) {
    return res.status(400).json({ error: "invalid_request", message: "Could not parse body" });
  }

  const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: bodyParams.toString(),
  });

  const text = await r.text();
  res.status(r.status);
  res.setHeader("content-type", "application/json");
  res.send(text);
}
