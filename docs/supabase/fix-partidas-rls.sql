-- =============================================================================
-- Fix RLS: tabela partidas (INSERT / UPDATE / DELETE / SELECT)
-- Execute no SQL Editor do Supabase quando aparecer:
--   new row violates row-level security policy for table "partidas" (42501)
--
-- Causa comum: migration-campeonato-share-link.sql recriou só SELECT e removeu
-- INSERT, ou o WITH CHECK não enxerga o campeonato por causa de RLS aninhado.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Grants
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partidas to authenticated;
grant select on public.partidas to anon;

-- -----------------------------------------------------------------------------
-- 2) Helper security definer — dono do campeonato personalizado
--    (evita falha do EXISTS quando RLS em campeonatos bloqueia a subquery)
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

-- -----------------------------------------------------------------------------
-- 3) Remover policies antigas / conflitantes
-- -----------------------------------------------------------------------------
drop policy if exists "partidas_read_all" on public.partidas;
drop policy if exists "partidas_insert_auth" on public.partidas;
drop policy if exists "partidas_select_all" on public.partidas;
drop policy if exists "partidas_insert_own_campeonato" on public.partidas;
drop policy if exists "partidas_insert" on public.partidas;
drop policy if exists "partidas_insert_owner" on public.partidas;
drop policy if exists "partidas_update_owner" on public.partidas;
drop policy if exists "partidas_delete_owner" on public.partidas;
drop policy if exists "partidas_select_oficial" on public.partidas;
drop policy if exists "partidas_select_own" on public.partidas;
drop policy if exists "partidas_select_via_bolao" on public.partidas;
drop policy if exists "partidas_select_via_link" on public.partidas;

alter table public.partidas enable row level security;

-- -----------------------------------------------------------------------------
-- 4) SELECT — quem pode ver partidas
-- -----------------------------------------------------------------------------

-- Oficiais: leitura pública
create policy "partidas_select_oficial"
  on public.partidas
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.campeonatos c
      where c.id = campeonato_id
        and c.tipo = 'oficial'
    )
  );

-- Dono: campeonato personalizado próprio
create policy "partidas_select_own"
  on public.partidas
  for select
  to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

-- Bolões: quem tem bolão vinculado à partida
create policy "partidas_select_via_bolao"
  on public.partidas
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.boloes b
      where b.partida_id = partidas.id
    )
  );

-- Visitantes com link: use a RPC get_partidas_por_link(slug) — security definer
-- (não abrimos SELECT amplo em personalizados alheios)

-- -----------------------------------------------------------------------------
-- 5) INSERT / UPDATE / DELETE — somente dono do campeonato personalizado
-- -----------------------------------------------------------------------------

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
-- 6) RPC por link — retorna colunas atuais (inclui fase, escudos, ordem)
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
  banner_url text,
  escudo_url text,
  descricao text,
  cidade text,
  data_inicio timestamptz,
  data_fim timestamptz,
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
    c.banner_url,
    c.escudo_url,
    c.descricao,
    c.cidade,
    c.data_inicio,
    c.data_fim,
    c.ativo,
    c.created_at
  from public.campeonatos c
  where c.tipo = 'personalizado'
    and c.ativo = true
    and c.slug = p_slug
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
  order by p.ordem nulls last, p.data_partida nulls last, p.id;
$$;

revoke all on function public.get_campeonato_por_link(text) from public;
revoke all on function public.get_partidas_por_link(text) from public;
grant execute on function public.get_campeonato_por_link(text) to anon, authenticated;
grant execute on function public.get_partidas_por_link(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7) RPC INSERT — contorna RLS quebrado; valida auth.uid() = owner_id
-- -----------------------------------------------------------------------------
create or replace function public.insert_partidas_para_dono(
  p_campeonato_id bigint,
  p_partidas jsonb
)
returns setof public.partidas
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not exists (
    select 1
    from public.campeonatos c
    where c.id = p_campeonato_id
      and c.tipo = 'personalizado'
      and c.owner_id = auth.uid()
  ) then
    raise exception 'Acesso negado: você não é o dono deste campeonato';
  end if;

  return query
  insert into public.partidas (
    campeonato_id,
    time_casa,
    time_fora,
    fase,
    escudo_casa,
    escudo_fora,
    ordem,
    status,
    data_partida
  )
  select
    p_campeonato_id,
    x.time_casa,
    x.time_fora,
    nullif(trim(x.fase), ''),
    nullif(trim(x.escudo_casa), ''),
    nullif(trim(x.escudo_fora), ''),
    coalesce(x.ordem, 0),
    coalesce(nullif(trim(x.status), ''), 'agendado'),
    case when x.data_partida is null or trim(x.data_partida) = '' then null
         else x.data_partida::timestamptz end
  from jsonb_to_recordset(p_partidas) as x(
    time_casa text,
    time_fora text,
    fase text,
    escudo_casa text,
    escudo_fora text,
    ordem integer,
    status text,
    data_partida text
  )
  returning *;
end;
$$;

revoke all on function public.insert_partidas_para_dono(bigint, jsonb) from public;
grant execute on function public.insert_partidas_para_dono(bigint, jsonb) to authenticated;

commit;

-- -----------------------------------------------------------------------------
-- 7) Verificação
-- -----------------------------------------------------------------------------
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'partidas'
order by policyname;

-- Teste manual (logado como dono no app):
-- 1) INSERT em campeonatos personalizado com owner_id = auth.uid()
-- 2) INSERT em partidas com campeonato_id do passo 1
