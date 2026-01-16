export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de Privacidade — SMR</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5; margin: 24px; color:#111; }
    h1,h2 { line-height: 1.2; }
    .box { max-width: 920px; }
    code { background:#f4f4f4; padding:2px 6px; border-radius:6px; }
    a { color:#0b5fff; }
    hr { border:none; border-top:1px solid #e5e5e5; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Política de Privacidade — SMR (Monitoramento da Reforma Tributária)</h1>
    <p><strong>Última atualização:</strong> 16/01/2026</p>

    <p>
      Esta Política descreve como dados podem ser tratados quando você utiliza o SMR e suas integrações
      (incluindo autenticação via Auth0 e validação de licença via Supabase), além de rotinas de ativação
      via webhook da Hotmart (quando aplicável).
    </p>

    <hr/>

    <h2>1) Quais dados podem ser coletados</h2>
    <ul>
      <li><strong>Dados de autenticação (Auth0):</strong> e-mail e identificadores básicos do usuário autenticado.</li>
      <li><strong>Dados de licença (Supabase):</strong> status da licença (ativa/inativa) associado ao e-mail.</li>
      <li><strong>Dados técnicos:</strong> logs mínimos de requisição (ex.: data/hora, status HTTP) para segurança e diagnóstico.</li>
      <li><strong>Webhook (Hotmart):</strong> quando configurado, pode receber eventos de compra/assinatura para ativação/atualização de licença.</li>
    </ul>

    <h2>2) Para que usamos os dados</h2>
    <ul>
      <li>Autenticar o usuário e permitir acesso às funcionalidades do SMR;</li>
      <li>Validar se o usuário possui licença ativa;</li>
      <li>Prevenir fraudes, abuso e acessos não autorizados;</li>
      <li>Operar integrações (ex.: Hotmart) estritamente para fins de ativação/gestão de licença.</li>
    </ul>

    <h2>3) Compartilhamento</h2>
    <p>
      Não vendemos dados pessoais. O compartilhamento pode ocorrer apenas com provedores envolvidos na operação do serviço,
      como Auth0 (autenticação), Supabase (banco/consulta de licença), Vercel (hospedagem) e Hotmart (pagamentos/webhook),
      na medida necessária para o funcionamento.
    </p>

    <h2>4) Retenção e segurança</h2>
    <p>
      Mantemos apenas o necessário para operação e auditoria básica. Segredos e chaves são armazenados como variáveis de ambiente
      na infraestrutura (ex.: Vercel) e não devem ser expostos publicamente.
    </p>

    <h2>5) Seus direitos</h2>
    <p>
      Você pode solicitar informações, correções ou exclusão de dados pessoais, quando aplicável, bem como esclarecimentos sobre o tratamento.
    </p>

    <h2>6) Contato</h2>
    <p>
      Para solicitações relacionadas à privacidade, entre em contato pelo e-mail: <strong>contato@eq7educacao.com.br</strong>
    </p>

    <hr/>

    <p style="font-size: 12px; color:#555;">
      Observação: Esta Política é disponibilizada para atender requisitos de ações públicas e integrações. Caso o SMR seja disponibilizado
      a terceiros, recomenda-se revisão jurídica para adequação completa à LGPD.
    </p>
  </div>
</body>
</html>`;

  return res.status(200).send(html);
}
