-- =============================================================================
-- Migration: owner_id, tipo, banner_url, descricao em public.campeonatos
-- Execute no SQL Editor do Supabase (projeto Palpite Gol)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Novas colunas
-- -----------------------------------------------------------------------------
alter table public.campeonatos
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists tipo text,
  add column if not exists banner_url text,
  add column if not exists descricao text;

-- -----------------------------------------------------------------------------
-- 2) Backfill de registros existentes
-- -----------------------------------------------------------------------------
-- Oficiais: api_league_id preenchido (ex.: Copa 2026)
update public.campeonatos
set
  tipo = 'oficial',
  owner_id = null
where api_league_id is not null
  and (tipo is null or tipo <> 'oficial');

-- Personalizados legados: sem api_league_id
update public.campeonatos
set tipo = 'personalizado'
where api_league_id is null
  and tipo is null;

-- Qualquer outro registro sem tipo
update public.campeonatos
set tipo = coalesce(tipo, 'personalizado')
where tipo is null;

-- Personalizados de teste sem dono (ex.: INSERT manual no SQL Editor)
-- Remove partidas órfãs e desativa ou apaga campeonatos sem owner_id
delete from public.partidas
where campeonato_id in (
  select id from public.campeonatos
  where tipo = 'personalizado' and owner_id is null
);

delete from public.campeonatos
where tipo = 'personalizado' and owner_id is null;

-- -----------------------------------------------------------------------------
-- 3) Defaults e constraints
-- -----------------------------------------------------------------------------
alter table public.campeonatos
  alter column tipo set default 'personalizado';

alter table public.campeonatos
  alter column tipo set not null;

alter table public.campeonatos
  drop constraint if exists campeonatos_tipo_check;

alter table public.campeonatos
  add constraint campeonatos_tipo_check
  check (tipo in ('oficial', 'personalizado'));

alter table public.campeonatos
  drop constraint if exists campeonatos_oficial_sem_owner;

alter table public.campeonatos
  add constraint campeonatos_oficial_sem_owner
  check (
    (tipo = 'oficial' and owner_id is null)
    or tipo = 'personalizado'
  );

alter table public.campeonatos
  drop constraint if exists campeonatos_personalizado_com_owner;

alter table public.campeonatos
  add constraint campeonatos_personalizado_com_owner
  check (
    tipo <> 'personalizado'
    or owner_id is not null
  );

create index if not exists idx_campeonatos_owner_id on public.campeonatos(owner_id);
create index if not exists idx_campeonatos_tipo on public.campeonatos(tipo);

-- -----------------------------------------------------------------------------
-- 4) GRANTs
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.campeonatos to anon, authenticated;
grant insert, update on public.campeonatos to authenticated;
grant select, insert on public.partidas to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) RLS — campeonatos (substitui políticas antigas)
-- -----------------------------------------------------------------------------
alter table public.campeonatos enable row level security;

drop policy if exists "campeonatos_read_all" on public.campeonatos;
drop policy if exists "campeonatos_insert_auth" on public.campeonatos;
drop policy if exists "campeonatos_select_oficial" on public.campeonatos;
drop policy if exists "campeonatos_select_own" on public.campeonatos;
drop policy if exists "campeonatos_insert_personalizado" on public.campeonatos;
drop policy if exists "campeonatos_update_own" on public.campeonatos;

-- Oficiais: leitura pública (anon + authenticated)
create policy "campeonatos_select_oficial"
  on public.campeonatos
  for select
  to anon, authenticated
  using (tipo = 'oficial' and ativo = true);

-- Personalizados: só o dono vê os seus
create policy "campeonatos_select_own"
  on public.campeonatos
  for select
  to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid());

-- Criar personalizado: dono deve ser o usuário logado
create policy "campeonatos_insert_personalizado"
  on public.campeonatos
  for insert
  to authenticated
  with check (
    tipo = 'personalizado'
    and owner_id = auth.uid()
  );

-- Editar personalizado: só o dono
create policy "campeonatos_update_own"
  on public.campeonatos
  for update
  to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid())
  with check (
    tipo = 'personalizado'
    and owner_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 6) RLS — partidas (insert autenticado; leitura ampla para fluxo de bolões)
-- -----------------------------------------------------------------------------
alter table public.partidas enable row level security;

drop policy if exists "partidas_read_all" on public.partidas;
drop policy if exists "partidas_insert_auth" on public.partidas;
drop policy if exists "partidas_select_all" on public.partidas;
drop policy if exists "partidas_insert_own_campeonato" on public.partidas;

-- Participantes de bolões precisam ver partidas de campeonatos oficiais e personalizados
create policy "partidas_select_all"
  on public.partidas
  for select
  to anon, authenticated
  using (true);

-- Inserir partida: somente em campeonato personalizado do dono
create policy "partidas_insert_own_campeonato"
  on public.partidas
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.campeonatos c
      where c.id = campeonato_id
        and c.tipo = 'personalizado'
        and c.owner_id = auth.uid()
    )
  );

commit;

-- -----------------------------------------------------------------------------
-- 7) Verificação pós-migration
-- -----------------------------------------------------------------------------
select id, nome, tipo, owner_id, api_league_id, ativo, banner_url, descricao, created_at
from public.campeonatos
order by tipo, id;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('campeonatos', 'partidas')
order by tablename, policyname;
