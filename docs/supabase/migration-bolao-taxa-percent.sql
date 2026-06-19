-- =============================================================================
-- Migration: taxa_percent editável no bolão
-- Substitui cobra_taxa (boolean) por taxa_percent (0–100).
-- 0 = sem taxa; prêmio líquido vai para o(s) vencedor(es).
-- Execute no SQL Editor do Supabase (após migration-bolao-taxa.sql, se já rodou).
-- =============================================================================

begin;

alter table public.boloes
  add column if not exists taxa_percent numeric(5, 2) not null default 0;

comment on column public.boloes.taxa_percent is
  'Percentual da taxa da plataforma (0–100). Padrão 0 = sem taxa.';

-- Migra dados antigos de cobra_taxa, se a coluna existir
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'boloes'
      and column_name = 'cobra_taxa'
  ) then
    update public.boloes
    set taxa_percent = case when cobra_taxa then 10 else 0 end
    where taxa_percent = 0 and cobra_taxa = true;
  end if;
end $$;

-- RPC de criação com taxa_percent
create or replace function public.insert_bolao_para_usuario(
  p_partida_id bigint,
  p_slug text,
  p_stake numeric,
  p_modo_exclusivo boolean,
  p_taxa_percent numeric default 0
)
returns setof public.boloes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1
    from public.partidas p
    join public.campeonatos c on c.id = p.campeonato_id
    where p.id = p_partida_id
      and (
        c.tipo = 'oficial'
        or (c.tipo = 'personalizado' and c.owner_id = v_uid)
      )
  ) then
    raise exception 'Partida não encontrada ou sem permissão';
  end if;

  return query
  insert into public.boloes (
    slug,
    usuario_id,
    partida_id,
    stake,
    modo_exclusivo,
    taxa_percent,
    status
  )
  values (
    p_slug,
    v_uid,
    p_partida_id,
    p_stake,
    p_modo_exclusivo,
    greatest(0, least(100, coalesce(p_taxa_percent, 0))),
    'aberto'
  )
  returning *;
end;
$$;

revoke all on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, numeric) from public;
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, numeric) to authenticated;

-- Compatibilidade: assinaturas antigas ainda funcionam via overload/default
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) to authenticated;

commit;
