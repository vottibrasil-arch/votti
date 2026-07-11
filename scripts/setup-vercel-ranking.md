# Variáveis Vercel — votti-jet (OBRIGATÓRIO)

Adicione **todas** em Production + Preview, depois **Redeploy**:

| Variável | Onde pegar no Supabase → API |
|----------|------------------------------|
| `SUPABASE_URL` | Project URL → `https://ppvhlocqetyrsqidijms.supabase.co` |
| `SUPABASE_ANON_KEY` | **Publishable key** (não é a service role!) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** / service_role |
| `VITE_SUPABASE_URL` | Igual `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Igual publishable key |
| `VITE_APP_URL` | `https://votti-jet.vercel.app` |

## Erros comuns

- **Cadastro: "Chave Supabase inválida"** → `SUPABASE_SERVICE_ROLE_KEY` errada OU falta `VITE_SUPABASE_ANON_KEY`. Use a **publishable key** em `VITE_*`, não a secret.
- **Ranking 500** → falta redeploy após salvar variáveis.

## Pode remover (versão antiga Redis)

- `VOTTI_WEBHOOK_SECRET`

## Depois de salvar

1. **Deployments → ⋯ → Redeploy**
2. Cadastro: `https://votti-jet.vercel.app/cadastro`
3. Ranking: `https://votti-jet.vercel.app/votacao/UGD284/resultados`

