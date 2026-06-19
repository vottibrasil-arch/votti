-- =============================================================================
-- Migration: taxa opcional no bolão (cobra_taxa)
-- Padrão: false = organizador recebe 100% do pote (sem taxa da plataforma)
-- Execute no SQL Editor do Supabase
-- =============================================================================

begin;

alter table public.boloes
  add column if not exists cobra_taxa boolean not null default false;

comment on column public.boloes.cobra_taxa is
  'Se true, aplica taxa da plataforma no prêmio. Padrão false = sem taxa para o organizador.';

-- DELETE só pelo dono
drop policy if exists "boloes_delete_own" on public.boloes;
create policy "boloes_delete_own"
  on public.boloes
  for delete
  to authenticated
  using (auth.uid() = usuario_id);

grant delete on public.boloes to authenticated;

-- Atualiza RPC de criação (se existir)
create or replace function public.insert_bolao_para_usuario(
  p_partida_id bigint,
  p_slug text,
  p_stake numeric,
  p_modo_exclusivo boolean,
  p_cobra_taxa boolean default false
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
    cobra_taxa,
    status
  )
  values (
    p_slug,
    v_uid,
    p_partida_id,
    p_stake,
    p_modo_exclusivo,
    coalesce(p_cobra_taxa, false),
    'aberto'
  )
  returning *;
end;
$$;

revoke all on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, boolean) from public;
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, boolean) to authenticated;

-- Compatibilidade: assinatura antiga (4 params) ainda funciona via default
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) to authenticated;

commit;
