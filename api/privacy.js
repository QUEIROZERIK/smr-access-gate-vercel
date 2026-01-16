export default function handler(req, res) {
  // O Builder pode chamar HEAD/OPTIONS para validar a URL
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de Privacidade — SMR</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 900px; margin: 40px auto; padding: 0 16px;">
  <h1>Política de Privacidade — SMR</h1>
  <p>Esta página descreve como dados podem ser tratados no contexto do SMR (Sistema de Monitoramento da Reforma Tributária).</p>
  <h2>Dados</h2>
  <p>Podem ser tratados dados mínimos para autenticação/licenciamento (ex.: e-mail) e registros técnicos de operação.</p>
  <h2>Finalidade</h2>
  <p>Autenticação, validação de licença, prevenção a fraudes e melhoria do serviço.</p>
  <h2>Compartilhamento</h2>
  <p>Não há venda de dados. Compartilhamentos podem ocorrer com provedores técnicos essenciais (ex.: autenticação/infra).</p>
  <h2>Contato</h2>
  <p>Para solicitações relacionadas a privacidade, utilize o canal oficial do administrador do SMR.</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  // Para HEAD, não envie body
  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  res.status(200).send(html);
}
