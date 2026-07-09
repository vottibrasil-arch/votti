# Checklist de lançamento — VOTTI

## SQL (Supabase)

Execute no SQL Editor:

1. `docs/supabase/migration-ranking-snapshots.sql`
2. `docs/supabase/migration-lockdown-public-votes.sql` (bloqueia leitura pública de votes)

## Vercel — time votti1

Variáveis em **Production**:

- `VITE_APP_URL=https://votti.app`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy manual: `.\scripts\deploy-votti1.ps1`

## Validar

```bash
curl https://votti.app/ranking/SEU_SLUG
curl https://votti.app/api/polls/SEU_SLUG/meta
```

Votar → telão atualiza em ~2s (sem webhook).

## Arquitetura

```
Voto → Supabase
     → App chama refresh-snapshot
     → ranking_snapshots
     → GET /ranking/{slug}
     → Espectadores
```

Apenas **Supabase + Vercel**.
