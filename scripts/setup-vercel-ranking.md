# Variáveis Vercel — votti-jet (OBRIGATÓRIO)

Adicione **todas** em Production + Preview, depois **Redeploy**:

| Variável | Valor |
|----------|--------|
| `SUPABASE_URL` | `https://ppvhlocqetyrsqidijms.supabase.co` |
| `SUPABASE_ANON_KEY` | publishable key (Supabase → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (Supabase → API) |
| `VITE_SUPABASE_URL` | `https://ppvhlocqetyrsqidijms.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | mesma publishable key |
| `VITE_APP_URL` | `https://votti-jet.vercel.app` |

## Pode remover (versão antiga Redis)

- `VOTTI_WEBHOOK_SECRET` — não é usado na versão 3

## Depois de salvar variáveis

1. **Deployments → ⋯ → Redeploy** (obrigatório — env só vale após redeploy)
2. Teste: `https://votti-jet.vercel.app/ranking/UGD284`

## SQL opcional (melhora leitura sem service role)

`docs/supabase/migration-ranking-public-read.sql`
