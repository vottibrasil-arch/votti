-- =============================================================================
-- Migration: slug + visibilidade privado_link + acesso só por link
-- Execute APÓS migration-campeonatos-owner.sql
--
-- Objetivo: campeonato personalizado NÃO aparece em listagens públicas.
-- Só o dono (Meus) ou quem tem o slug do link acessa via RPC.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Colunas de compartilhamento
-- -----------------------------------------------------------------------------
alter table public.campeonatos
  add column if not exists slug text,
  add column if not exists visibilidade text;

update public.campeonatos
set visibilidade = 'privado_link'
where tipo = 'personalizado' and visibilidade is null;

update public.campeonatos
set visibilidade = 'publico'
where tipo = 'oficial' and visibilidade is null;

alter table public.campeonatos
  alter column visibilidade set default 'privado_link';

alter table public.campeonatos
  drop constraint if exists campeonatos_visibilidade_check;

alter table public.campeonatos
  add constraint campeonatos_visibilidade_check
  check (visibilidade in ('privado_link', 'publico'));

-- Slug legado para personalizados já existentes (antes do app gerar slug)
update public.campeonatos
set slug = 'camp-' || id::text
where tipo = 'personalizado' and slug is null;

create unique index if not exists idx_campeonatos_slug_unique
  on public.campeonatos (slug)
  where slug is not null;

alter table public.campeonatos
  drop constraint if exists campeonatos_personalizado_com_slug;

alter table public.campeonatos
  add constraint campeonatos_personalizado_com_slug
  check (
    tipo <> 'personalizado'
    or (owner_id is not null and slug is not null and visibilidade = 'privado_link')
  );

-- -----------------------------------------------------------------------------
-- 2) RLS partidas — não expor partidas de personalizados alheios
-- -----------------------------------------------------------------------------
drop policy if exists "partidas_select_all" on public.partidas;
drop policy if exists "partidas_select_oficial" on public.partidas;
drop policy if exists "partidas_select_own" on public.partidas;

create policy "partidas_select_oficial"
  on public.partidas
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.campeonatos c
      where c.id = campeonato_id and c.tipo = 'oficial'
    )
  );

create policy "partidas_select_own"
  on public.partidas
  for select
  to authenticated
  using (
    exists (
      select 1 from public.campeonatos c
      where c.id = campeonato_id
        and c.tipo = 'personalizado'
        and c.owner_id = auth.uid()
    )
  );

-- Bolões: participantes precisam ver a partida do bolão (via boloes → partidas)
drop policy if exists "partidas_select_via_bolao" on public.partidas;
create policy "partidas_select_via_bolao"
  on public.partidas
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.boloes b
      where b.partida_id = partidas.id
    )
  );

-- -----------------------------------------------------------------------------
-- 2b) INSERT / UPDATE / DELETE — dono do campeonato personalizado
--     (use fix-partidas-rls.sql se esta migration já foi aplicada sem estas policies)
-- -----------------------------------------------------------------------------
create or replace function public.is_partida_campeonato_owner(p_campeonato_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campeonatos c
    where c.id = p_campeonato_id
      and c.tipo = 'personalizado'
      and c.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_partida_campeonato_owner(bigint) from public;
grant execute on function public.is_partida_campeonato_owner(bigint) to authenticated;

grant insert, update, delete on public.partidas to authenticated;

drop policy if exists "partidas_insert_own_campeonato" on public.partidas;
drop policy if exists "partidas_insert_owner" on public.partidas;
drop policy if exists "partidas_update_owner" on public.partidas;
drop policy if exists "partidas_delete_owner" on public.partidas;

create policy "partidas_insert_owner"
  on public.partidas
  for insert
  to authenticated
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_update_owner"
  on public.partidas
  for update
  to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id))
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_delete_owner"
  on public.partidas
  for delete
  to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

-- -----------------------------------------------------------------------------
-- 3) RPC — acesso por link (sem listar todos os personalizados)
-- -----------------------------------------------------------------------------
drop function if exists public.get_campeonato_por_link(text);
drop function if exists public.get_partidas_por_link(text);

create function public.get_campeonato_por_link(p_slug text)
returns table (
  id bigint,
  nome text,
  tipo text,
  owner_id uuid,
  slug text,
  visibilidade text,
  banner_url text,
  descricao text,
  ativo boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.tipo,
    c.owner_id,
    c.slug,
    c.visibilidade,
    c.banner_url,
    c.descricao,
    c.ativo,
    c.created_at
  from public.campeonatos c
  where c.tipo = 'personalizado'
    and c.ativo = true
    and c.slug = p_slug
    and c.visibilidade = 'privado_link'
  limit 1;
$$;

create function public.get_partidas_por_link(p_slug text)
returns setof public.partidas
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.partidas p
  inner join public.campeonatos c on c.id = p.campeonato_id
  where c.tipo = 'personalizado'
    and c.ativo = true
    and c.slug = p_slug
    and c.visibilidade = 'privado_link'
  order by p.data_partida nulls last, p.id;
$$;

revoke all on function public.get_campeonato_por_link(text) from public;
revoke all on function public.get_partidas_por_link(text) from public;

grant execute on function public.get_campeonato_por_link(text) to anon, authenticated;
grant execute on function public.get_partidas_por_link(text) to anon, authenticated;

commit;

-- -----------------------------------------------------------------------------
-- 4) Verificação
-- -----------------------------------------------------------------------------
select id, nome, tipo, slug, visibilidade, owner_id
from public.campeonatos
where tipo = 'personalizado'
order by id;

-- Teste (troque o slug):
-- select * from get_campeonato_por_link('camp-1');
-- select * from get_partidas_por_link('camp-1');
