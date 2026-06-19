# Changelog

## [Unreleased] — Refatoração inicial

### Adicionado
- Pasta `docs/` com guias de Supabase e API de jogos
- `src/lib/bolao/` — tipos, mock centralizado, scoring, formatação
- `src/components/bolao/` — componentes reutilizáveis (MatchHeader, ScorePicker, etc.)
- `src/components/landing/` — seções extraídas da home
- `src/lib/api/supabase.server.ts` — stub cliente Supabase
- `src/lib/api/matches.server.ts` — stub API-Football
- Schema SQL inicial em `docs/supabase/schema.sql`

### Alterado
- Todas as rotas usam `DEMO_BOLAO` como fonte única de dados
- Lógica de ranking extraída para `scoring.ts`
- Erros 404 e mensagens de falha em português
- `html lang="pt-BR"`

### Removido
- ~40 componentes shadcn não utilizados (`src/components/ui/`)
- `bolao-data.ts`, `example.functions.ts`, `utils.ts`, `use-mobile.tsx`
- Dependências Radix, recharts, react-hook-form e outras libs do shadcn

### Próximo
- Rotas dinâmicas `/b/$slug`
- `createServerFn` para CRUD no Supabase
- Sincronização de placar via API de jogos
