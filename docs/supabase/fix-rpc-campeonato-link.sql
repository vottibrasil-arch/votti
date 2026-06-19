-- =============================================================================
-- Fix: recriar RPCs get_campeonato_por_link / get_partidas_por_link
-- Use quando aparecer:
--   ERROR 42P13: cannot change return type of existing function
--   Hint: Use DROP FUNCTION get_campeonato_por_link(text) first.
-- =============================================================================

begin;

-- Colunas usadas pelo app (ignora se já existirem)
alter table public.campeonatos add column if not exists escudo_url text;
alter table public.campeonatos add column if not exists cidade text;
alter table public.campeonatos add column if not exists data_inicio timestamptz;
alter table public.campeonatos add column if not exists data_fim timestamptz;

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

commit;

-- Teste (troque o slug):
-- select * from get_campeonato_por_link('camp-1');
-- select * from get_partidas_por_link('camp-1');
