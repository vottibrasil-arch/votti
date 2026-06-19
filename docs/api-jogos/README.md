# API de Jogos

O Palpite Gol precisa de placar e minuto em tempo real. O stub atual usa **API-Football** (api-sports.io).

## 1. Obter chave

1. Crie conta em [api-football.com](https://www.api-football.com/)
2. Gere sua API key no dashboard
3. Plano gratuito: 100 req/dia (suficiente para desenvolvimento)

## 2. Configurar `.env`

```
FOOTBALL_API_BASE=https://v3.football.api-sports.io
FOOTBALL_API_KEY=sua-chave
```

## 3. Código no projeto

- `src/lib/api/matches.server.ts` — função `fetchLiveFixtures()`
- Chamada apenas no servidor (nunca exponha a chave no browser)

## 4. Fluxo de sincronização (a implementar)

```
Cron / webhook a cada 30s
  → fetchLiveFixtures(leagueId)
  → upsert em matches (Supabase)
  → Realtime notifica clientes em /live
```

## 5. IDs de ligas úteis

| Liga | ID API-Football |
|------|-----------------|
| Copa do Mundo FIFA | 1 |
| Libertadores | 13 |
| Brasileirão Série A | 71 |

Ajuste `leagueId` em `fetchLiveFixtures()` conforme o campeonato do bolão.

## 6. Mapeamento para o app

| Campo API | Campo `matches` (Supabase) |
|-----------|----------------------------|
| `teams.home.name` | `home_team` |
| `teams.away.name` | `away_team` |
| `goals.home` | `score_home` |
| `goals.away` | `score_away` |
| `fixture.status.elapsed` | `minute` |
| `fixture.status.short` | `status` |

Enquanto a API não estiver ligada, as páginas usam `DEMO_BOLAO` em `src/lib/bolao/mock.ts`.
