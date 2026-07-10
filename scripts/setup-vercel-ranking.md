# Ranking snapshot — configurar Vercel (votti-jet ou votti1)
#
# O ranking publico retorna HTTP 500 sem SUPABASE_SERVICE_ROLE_KEY.
#
# 1. Abra o painel do projeto (ex.: votti-jet ou votti1)
# 2. Settings -> Environment Variables -> Production
# 3. Adicione:
#
#   SUPABASE_URL=https://ppvhlocqetyrsqidijms.supabase.co
#   SUPABASE_ANON_KEY=<publishable key>
#   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
#   VITE_APP_URL=https://SEU_DOMINIO.vercel.app
#
# 4. Redeploy (Deployments -> ... -> Redeploy)
#
# 5. Sincronize snapshots no Supabase (local, com .env):
#   npm run seed:ranking:all
#
# 6. Teste:
#   curl https://SEU_DOMINIO/ranking/UGD284
#
# Eleicao Tocantins = slug UGD284 (5 votos apos seed)
