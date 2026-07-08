-- =============================================================================
-- VOTTI — SETUP COMPLETO DO BANCO (Supabase)
-- =============================================================================
--
-- COMO USAR
--   1. Abra: supabase.com/dashboard → seu projeto → SQL Editor
--   2. New query → cole TODO este arquivo → Run (pode rodar de novo sem erro)
--   3. No terminal do projeto: npm run test:supabase
--
-- ÍNDICE
--   §1  Extensão
--   §2  Tabelas (profiles, polls, questions, options, votes)
--   §3  Índices
--   §4  View (poll_results)
--   §5  Funções (generate_poll_slug, handle_new_user, set_updated_at)
--   §6  Triggers
--   §7  Segurança — RLS (Row Level Security)
--   §8  Storage (logos e capas)
--   §9  Realtime (resultados ao vivo)
--
-- MAPEAMENTO WIZARD → BANCO (tabela polls)
--   Título ..................... title
--   Descrição .................. description
--   Categoria .................. category
--   Logo (caixinha upload) ..... logo_url  →  Storage: poll-assets/{user_id}/logo/
--   Imagem de capa ............. photo_url  →  Storage: poll-assets/{user_id}/cover/
--   Cor principal .............. primary_color
--   Configurações (passo 4) .... settings (jsonb)
--   Perguntas .................. questions + options
--   Votos ...................... votes (voter_token = 1 voto/pessoa/pergunta)
--
-- =============================================================================


-- =============================================================================
-- §1  EXTENSÃO
-- =============================================================================

create extension if not exists "pgcrypto";


-- =============================================================================
-- §2  TABELAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles — organizador autenticado
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- polls — votação
--   logo_url   ← upload wizard (Storage poll-assets/.../logo/)
--   photo_url  ← capa wizard   (Storage poll-assets/.../cover/)
--   settings   ← passo Configurações (jsonb)
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  owner_id       uuid references auth.users(id) on delete set null,
  title          text not null,
  description    text,
  category       text,
  organizer_name text,
  logo_url       text,
  photo_url      text,
  primary_color  text,
  is_premium     boolean not null default false,
  status         text not null default 'active'
                 check (status in ('draft', 'active', 'closed')),
  settings       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- coluna extra (se a tabela já existia de uma execução anterior)
alter table public.polls
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- questions — perguntas da votação
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls(id) on delete cascade,
  text        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- options — opções de resposta
-- ---------------------------------------------------------------------------
create table if not exists public.options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  text         text not null,
  sort_order   integer not null default 0,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- votes — 1 voto por pessoa por pergunta (voter_token anônimo)
-- ---------------------------------------------------------------------------
create table if not exists public.votes (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references public.polls(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  option_id    uuid not null references public.options(id) on delete cascade,
  voter_token  text not null,
  created_at   timestamptz not null default now(),
  unique (poll_id, question_id, voter_token)
);


-- =============================================================================
-- §3  ÍNDICES
-- =============================================================================

create index if not exists idx_polls_slug        on public.polls(slug);
create index if not exists idx_polls_owner_id    on public.polls(owner_id);
create index if not exists idx_polls_status      on public.polls(status);
create index if not exists idx_questions_poll_id on public.questions(poll_id);
create index if not exists idx_options_question_id on public.options(question_id);
create index if not exists idx_votes_poll_id     on public.votes(poll_id);
create index if not exists idx_votes_question_id on public.votes(question_id);


-- =============================================================================
-- §4  VIEW — resultados agregados
-- =============================================================================

create or replace view public.poll_results as
select
  q.poll_id,
  q.id         as question_id,
  o.id         as option_id,
  o.text       as option_text,
  o.sort_order,
  count(v.id)::bigint as vote_count
from public.questions q
join public.options o on o.question_id = q.id
left join public.votes v on v.option_id = o.id
group by q.poll_id, q.id, o.id, o.text, o.sort_order;


-- =============================================================================
-- §5  FUNÇÕES
-- =============================================================================

-- Slug curto aleatório (ex: ABC123)
create or replace function public.generate_poll_slug()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.polls where slug = result);
  end loop;
  return result;
end;
$$;

-- Cria perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'Organizador'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- §6  TRIGGERS
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists polls_set_updated_at on public.polls;
create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- =============================================================================
-- §7  SEGURANÇA — RLS (Row Level Security)
-- =============================================================================
-- Pode rodar de novo: remove policies antigas antes de recriar.

alter table public.profiles  enable row level security;
alter table public.polls     enable row level security;
alter table public.questions enable row level security;
alter table public.options   enable row level security;
alter table public.votes     enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── polls ───────────────────────────────────────────────────────────────────
drop policy if exists "polls_select_active" on public.polls;
drop policy if exists "polls_select_own" on public.polls;
drop policy if exists "polls_insert_auth" on public.polls;
drop policy if exists "polls_update_own" on public.polls;
drop policy if exists "polls_delete_own" on public.polls;

create policy "polls_select_active" on public.polls
  for select to anon, authenticated
  using (status = 'active');

create policy "polls_select_own" on public.polls
  for select to authenticated
  using (owner_id = auth.uid());

create policy "polls_insert_auth" on public.polls
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "polls_update_own" on public.polls
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "polls_delete_own" on public.polls
  for delete to authenticated
  using (owner_id = auth.uid());

-- ── questions ───────────────────────────────────────────────────────────────
drop policy if exists "questions_select_public" on public.questions;
drop policy if exists "questions_insert_own" on public.questions;
drop policy if exists "questions_update_own" on public.questions;
drop policy if exists "questions_delete_own" on public.questions;

create policy "questions_select_public" on public.questions
  for select to anon, authenticated
  using (exists (
    select 1 from public.polls p
    where p.id = poll_id and (p.status = 'active' or p.owner_id = auth.uid())
  ));

create policy "questions_insert_own" on public.questions
  for insert to authenticated
  with check (exists (
    select 1 from public.polls p where p.id = poll_id and p.owner_id = auth.uid()
  ));

create policy "questions_update_own" on public.questions
  for update to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and p.owner_id = auth.uid()
  ));

create policy "questions_delete_own" on public.questions
  for delete to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and p.owner_id = auth.uid()
  ));

-- ── options ─────────────────────────────────────────────────────────────────
drop policy if exists "options_select_public" on public.options;
drop policy if exists "options_insert_own" on public.options;
drop policy if exists "options_update_own" on public.options;
drop policy if exists "options_delete_own" on public.options;

create policy "options_select_public" on public.options
  for select to anon, authenticated
  using (exists (
    select 1 from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id and (p.status = 'active' or p.owner_id = auth.uid())
  ));

create policy "options_insert_own" on public.options
  for insert to authenticated
  with check (exists (
    select 1 from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id and p.owner_id = auth.uid()
  ));

create policy "options_update_own" on public.options
  for update to authenticated
  using (exists (
    select 1 from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id and p.owner_id = auth.uid()
  ));

create policy "options_delete_own" on public.options
  for delete to authenticated
  using (exists (
    select 1 from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id and p.owner_id = auth.uid()
  ));

-- ── votes ───────────────────────────────────────────────────────────────────
drop policy if exists "votes_select_public" on public.votes;
drop policy if exists "votes_insert_public" on public.votes;
drop policy if exists "votes_select_own" on public.votes;

create policy "votes_select_public" on public.votes
  for select to anon, authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and p.status = 'active'
  ));

create policy "votes_insert_public" on public.votes
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.polls p where p.id = poll_id and p.status = 'active'
  ));

create policy "votes_select_own" on public.votes
  for select to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and p.owner_id = auth.uid()
  ));

-- ── view poll_results ───────────────────────────────────────────────────────
grant select on public.poll_results to anon, authenticated;


-- =============================================================================
-- §8  STORAGE — logos e capas
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('poll-assets', 'poll-assets', true)
on conflict (id) do nothing;

drop policy if exists "poll_assets_public_read" on storage.objects;
drop policy if exists "poll_assets_auth_upload" on storage.objects;
drop policy if exists "poll_assets_auth_update" on storage.objects;
drop policy if exists "poll_assets_auth_delete" on storage.objects;

create policy "poll_assets_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'poll-assets');

create policy "poll_assets_auth_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'poll-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "poll_assets_auth_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'poll-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "poll_assets_auth_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'poll-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- §9  REALTIME — resultados ao vivo
-- =============================================================================

do $$
begin
  alter publication supabase_realtime add table public.votes;
exception
  when duplicate_object then null;
end $$;


-- =============================================================================
-- FIM — confira no Supabase:
--   Table Editor: profiles, polls, questions, options, votes
--   Database → Views: poll_results
--   Database → Functions: generate_poll_slug, handle_new_user
-- =============================================================================
