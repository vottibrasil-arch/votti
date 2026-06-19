# Supabase — Palpite Gol

## 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Anote **Project URL** e **anon/publishable key** em Settings → API
3. Copie também a **service_role / secret key** (somente servidor, nunca no browser)

## 2. Rodar o schema

1. Abra **SQL Editor** no painel do Supabase
2. Execute [`schema.sql`](./schema.sql)
3. Execute [`seed-copa-2026.sql`](./seed-copa-2026.sql) para criar o campeonato e partidas de exemplo
4. Confirme as tabelas: `profiles`, `campeonatos`, `partidas`, `boloes`, `participantes`

## 3. Configurar `.env`

O arquivo `.env` deve ficar na **raiz do projeto** (`palpite_gol/.env`), ao lado de `package.json`.

```powershell
copy docs\env.example .env
```

Preencha (URL e chave nos dois blocos — servidor e `VITE_`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # opcional para leituras; necessária só para bypass de RLS no servidor
```

**Importante:** `SUPABASE_SERVICE_ROLE_KEY` vazia **não impede** leitura de campeonatos/partidas com a chave anon/publishable, desde que as políticas RLS estejam aplicadas.

### Testar conexão

```powershell
node scripts/test-supabase.mjs
```

No `npm run dev`, o servidor também loga o teste no console na primeira requisição.

Se conectar mas retornar **0 campeonatos**, execute [`rls-policies.sql`](./rls-policies.sql) no SQL Editor.

Se ao **criar campeonato personalizado** aparecer `new row violates row-level security policy for table "partidas" (42501)`, execute [`fix-partidas-rls.sql`](./fix-partidas-rls.sql).

Se ao **criar bolão** aparecer `new row violates row-level security policy for table "boloes" (42501)`, execute [`fix-boloes-rls.sql`](./fix-boloes-rls.sql).

## 4. Auth

Habilite **Email** em Authentication → Providers no painel Supabase.

Rotas:
- `/login` — entrar ou criar conta
- `/create` — wizard de criação (requer login)
- `/meus-boloes` — bolões do usuário logado

## 5. Código no projeto

- Cliente admin: `src/lib/api/supabase.server.ts`
- Cliente browser: `src/lib/api/supabase-browser.ts`
- Server functions: `src/lib/api/boloes.server.ts`, `src/lib/api/matches-list.server.ts`
- Config: `src/lib/config.server.ts`

## Tabelas

| Tabela | Uso |
|--------|-----|
| `profiles` | Nome do usuário (vinculado a `auth.users`) |
| `campeonatos` | Oficiais (`tipo=oficial`) e personalizados (`tipo=personalizado`, `owner_id`, `slug`) |
| `partidas` | Jogos de cada campeonato |
| `boloes` | Bolões criados (`usuario_id`, `partida_id`, `slug`, `stake`, `modo_exclusivo`) |
| `participantes` | Palpites de cada bolão |

### Campeonato personalizado (documentação completa)

Ver **[campeonato-personalizado.md](./campeonato-personalizado.md)** — modelo do banco, upload de fotos, visibilidade **só por link**, ordem das migrations e RPC `get_campeonato_por_link`.

Migrations relacionadas (ordem):

1. [`migration-campeonatos-owner.sql`](./migration-campeonatos-owner.sql)
2. [`storage-campeonatos.sql`](./storage-campeonatos.sql)
3. [`migration-campeonato-share-link.sql`](./migration-campeonato-share-link.sql)
4. [`migration-partidas-jogos.sql`](./migration-partidas-jogos.sql) — colunas `fase`, `escudo_casa`, `escudo_fora`, `ordem`
5. [`fix-partidas-rls.sql`](./fix-partidas-rls.sql) — **obrigatório** se INSERT em `partidas` falhar com RLS 42501
6. [`fix-boloes-rls.sql`](./fix-boloes-rls.sql) — **obrigatório** se INSERT em `boloes` falhar com RLS 42501

## Mapeamento no app

| Campo no banco | Campo na UI |
|----------------|-------------|
| `boloes.usuario_id` | usuário logado |
| `boloes.partida_id` | partida selecionada no passo 2 |
| `boloes.modo_exclusivo` | toggle "Placar exclusivo" |
| `boloes.stake` | valor da aposta |
| `boloes.status` | `aberto` ao criar |

Os toggles "Mostrar participantes" e "Ranking ao vivo" permanecem na UI para o design, mas ainda não têm colunas no banco.
