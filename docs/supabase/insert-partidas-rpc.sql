-- Atalho: só a RPC de INSERT (se já rodou policies mas INSERT ainda falha)
-- Execute no SQL Editor do Supabase

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
