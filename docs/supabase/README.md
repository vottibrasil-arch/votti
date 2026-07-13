# Supabase — VOTTI

Projeto oficial: **`ppvhlocqetyrsqidijms`** → `https://ppvhlocqetyrsqidijms.supabase.co`

Não use outro projeto Supabase. O app bloqueia cadastro se detectar projeto diferente.

## Setup em 1 passo

No **SQL Editor** do Supabase, cole e execute:

```
docs/supabase/SETUP-COMPLETO.sql
```

Esse arquivo contém **tudo**: tabelas, índices, views, funções, triggers, RLS, storage e realtime.

> **Importante:** o schema que o Supabase mostra no Table Editor (só `CREATE TABLE`) **não basta**.
> Ele não inclui a view `poll_results`, a função `generate_poll_slug`, as policies RLS nem o storage.
> Use sempre o `SETUP-COMPLETO.sql` do projeto.

## Testar

```powershell
npm run test:supabase
```

Saída esperada: `✅ Supabase OK — projeto ppvhlocqetyrsqidijms acessível.`

## Chaves de API

Em **Project Settings → API**:

| Campo no Supabase | Variável no `.env` |
|-------------------|-------------------|
| Project URL | `SUPABASE_URL` e `VITE_SUPABASE_URL` |
| publishable key | `SUPABASE_ANON_KEY` e `VITE_SUPABASE_ANON_KEY` |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` (só servidor) |

Exemplo no `.env`:

```
VITE_SUPABASE_URL=https://ppvhlocqetyrsqidijms.supabase.co
VITE_SUPABASE_ANON_KEY=sua_publishable_key_aqui
```

> Use a URL **sem** `/rest/v1/`. O app corrige automaticamente URL/chave incorretas no `.env`.

## Auth

Em **Authentication → Providers**: habilite **Email** e/ou **Google**.

Em **Authentication → URL Configuration** (obrigatório para Google):

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://vottii.com` |
| **Redirect URLs** | `https://vottii.com/auth/callback` |
| | `https://www.vottii.com/auth/callback` |
| | `http://localhost:8080/auth/callback` |

| Ambiente | Redirect URL |
|----------|--------------|
| Local | `http://localhost:8080/auth/callback` |
| Produção | `https://vottii.com/auth/callback` |

### Google volta para `localhost:3000`?

O app agora usa **popup do Google na própria página** (sem redirect). Mesmo assim, configure:

1. **Vercel** → variável `GOOGLE_CLIENT_ID` = Web Client ID (o mesmo de Supabase → Authentication → Google)
2. **Google Cloud Console** → Credentials → Web client → **Authorized JavaScript origins**:
   - `https://vottii.com`
   - `http://localhost:8080`
3. **Supabase** → Authentication → URL Configuration:
   - **Site URL:** `https://vottii.com`
   - **Redirect URLs:** `https://vottii.com/auth/callback`

Se o popup não abrir, copie o Client ID em Supabase → Authentication → Providers → Google.

### Cadastro não aparece no banco?

1. **Front-end precisa das variáveis `VITE_`** — no `.env`, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (não basta só `SUPABASE_URL`). Depois **reinicie** `npm run dev`.
2. **Usuário fica em Authentication → Users**, não só na tabela `profiles`. O perfil em `profiles` é criado automaticamente pelo trigger do `SETUP-COMPLETO.sql`.
3. **Confirmação de e-mail** — se estiver ligada no Supabase, a conta é criada mas você só entra depois de clicar no link. Para testes, desligue em **Authentication → Providers → Email → Confirm email**.

### Onde fica o usuário cadastrado?

| Lugar | O que é |
|-------|---------|
| **Authentication → Users** | Conta de login (e-mail/senha) — **é aqui que o cadastro fica** |
| **Table Editor → profiles** | Perfil do organizador (criado automaticamente pelo trigger do SQL) |

Se o cadastro diz “e-mail já cadastrado” mas você não vê em **Table Editor**, olhe em **Authentication → Users** (inclua usuários não confirmados).

### Service role (opcional, recomendado)

Para o app validar e-mail no servidor antes do cadastro, preencha `SUPABASE_SERVICE_ROLE_KEY` no `.env` (Project Settings → API → service_role).

---

## Estrutura do banco

| § | Tabela / objeto | Função |
|---|-----------------|--------|
| 2 | `profiles` | Organizador (nome, plano) |
| 2 | `polls` | Votação (título, slug, cor, logo, settings) |
| 2 | `questions` | Perguntas |
| 2 | `options` | Opções de resposta |
| 2 | `votes` | Votos anônimos |
| 4 | `poll_results` | View — contagem por opção |
| 5 | `generate_poll_slug()` | Gera slug tipo `ABC123` |
| 8 | bucket `poll-assets` | Upload de logo/capa |
| 9 | Realtime em `votes` | Resultados ao vivo |

## Arquivos SQL

| Arquivo | Uso |
|---------|-----|
| **`SETUP-COMPLETO.sql`** | **Use este** — setup inteiro em 1 execução |
| `schema.sql` | Schema separado (legado) |
| `realtime.sql` | Só realtime (já incluso no SETUP-COMPLETO) |
| `migration-ranking-snapshots.sql` | Snapshots para ranking público |
| `migration-lockdown-public-votes.sql` | Bloqueia leitura pública de `votes` |
