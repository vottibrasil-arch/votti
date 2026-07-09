# Ranking ao vivo — snapshots (Supabase + Vercel)

O VOTTI distribui o ranking via **snapshots** em `ranking_snapshots`. O Supabase continua sendo a única fonte da verdade.

## Fluxo

```
Voto confirmado no app
     → INSERT em votes (Supabase)
     → POST /api/polls/{slug}/refresh-snapshot
     → API: 1 SELECT em poll_ranking_feed (poll_results)
     → UPSERT ranking_snapshots
     → Espectadores: GET /ranking/{slug} (cache CDN, poll 2s)
```

Sem webhook. Sem configuração extra no Supabase.

## SQL

Execute: `docs/supabase/migration-ranking-snapshots.sql`

## Variáveis (Vercel)

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Endpoints

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/ranking/{slug}` | Snapshot público (Cache-Control CDN) |
| GET | `/api/polls/{slug}/meta` | Tela de voto (sem contagens) |
| POST | `/api/polls/{slug}/refresh-snapshot` | Atualiza snapshot após voto |

## Leitura pública

Espectadores **nunca** consultam `votes` nem `poll_results` — apenas `GET /ranking/{slug}`.
