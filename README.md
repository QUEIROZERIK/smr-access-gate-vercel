# SMR Access Gate (Vercel)
API mínima para controlar acesso ao GPT via OAuth (Auth0) + licenças no Supabase.

## Endpoints
- GET /api/health
- GET /api/validate (exige OAuth Bearer token)
- POST /api/hotmart?secret=... (webhook Hotmart)

## Variáveis de ambiente (Vercel)
- AUTH0_DOMAIN (ex.: seu-tenant.us.auth0.com)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- HOTMART_WEBHOOK_SECRET
