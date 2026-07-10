# Ranking ao vivo — snapshots (v3)

O VOTTI distribui o ranking via **snapshots** em `ranking_snapshots`. O Supabase guarda os votos; a API Vercel monta e serve o ranking pronto.

## Fluxo

```
Voto confirmado
     → INSERT em votes (Supabase)
     → POST /api/polls/{slug}/refresh-snapshot
     → UPSERT ranking_snapshots
     → Espectadores: GET /ranking/{slug} (poll a cada 2s)
```

Na primeira visita, se o snapshot ainda não existir, `GET /ranking/{slug}` tenta gerá-lo automaticamente.

## SQL

Incluso em `docs/supabase/SETUP-COMPLETO.sql` (§10). Migração avulsa: `migration-ranking-snapshots.sql`.

## Variáveis (Vercel — obrigatório)

```env
VITE_APP_URL=https://votti.app
SUPABASE_URL=https://ppvhlocqetyrsqidijms.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   ← sem isso o ranking público fica em 0
```

## Endpoints

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/ranking/{slug}` | Snapshot público |
| GET | `/api/polls/{slug}/meta` | Tela de voto (sem contagens) |
| POST | `/api/polls/{slug}/refresh-snapshot` | Atualiza após voto |

## Sincronizar votações existentes

```powershell
npm run seed:ranking:all
# ou uma votação:
npm run seed:ranking -- SLUG
```

## Leitura pública

Espectadores consultam apenas `GET /ranking/{slug}` — nunca `votes` nem `poll_results` diretamente.
