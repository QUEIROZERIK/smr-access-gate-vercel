export default function handler(req, res) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de Privacidade — SMR</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; line-height: 1.5; padding: 0 16px;">
  <h1>Política de Privacidade — SMR</h1>
  <p>Esta página descreve como dados podem ser tratados no contexto do SMR (Sistema de Monitoramento da Reforma Tributária).</p>
  <h2>1. Dados</h2>
  <p>Podemos tratar dados mínimos necessários para autenticação e validação de licença (ex.: e-mail) e registros técnicos de uso (logs).</p>
  <h2>2. Finalidade</h2>
  <p>Permitir acesso ao produto, validar licenças e prevenir fraudes/uso indevido.</p>
  <h2>3. Compartilhamento</h2>
  <p>Não vendemos dados. Podemos usar provedores de infraestrutura (ex.: hospedagem e autenticação) estritamente para operar o serviço.</p>
  <h2>4. Segurança</h2>
  <p>Adotamos medidas técnicas e organizacionais para proteger os dados.</p>
  <h2>5. Contato</h2>
  <p>Contato: <a href="mailto:contato@eq7educacao.com.br">contato@eq7educacao.com.br</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Allow", "GET, HEAD");

  // IMPORTANTE: o validador pode chamar HEAD
  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  return res.status(200).send(html);
}
