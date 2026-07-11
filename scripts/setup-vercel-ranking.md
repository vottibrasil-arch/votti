# Corrigir ranking publico (votti-jet / votti.app)

## Passo 1 — SQL no Supabase (obrigatorio, 1 vez)

Cole no **SQL Editor** e execute:

```sql
grant select on public.ranking_snapshots to anon, authenticated;

drop policy if exists "ranking_snapshots_public_read" on public.ranking_snapshots;
create policy "ranking_snapshots_public_read" on public.ranking_snapshots
  for select to anon, authenticated
  using (true);
```

Arquivo: `docs/supabase/migration-ranking-public-read.sql`

## Passo 2 — Variaveis no Vercel (Production)

Minimo para **ler** ranking:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Para **atualizar** apos cada voto (refresh-snapshot):
- `SUPABASE_SERVICE_ROLE_KEY` (tambem necessario)

## Passo 3 — Redeploy

Deployments → ultimo deploy → **Redeploy**

## Passo 4 — Sincronizar snapshots (se necessario)

```powershell
npm run seed:ranking:all
```

## Testar

```
https://votti-jet.vercel.app/ranking/UGD284
https://votti-jet.vercel.app/votacao/UGD284/resultados
```

Eleicao Tocantins = slug **UGD284** (5 votos).
