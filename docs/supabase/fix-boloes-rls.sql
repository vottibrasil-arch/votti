-- =============================================================================
-- Fix RLS: tabela boloes (INSERT ao criar bolão)
-- Execute no SQL Editor do Supabase quando aparecer:
--   new row violates row-level security policy for table "boloes" (42501)
-- =============================================================================

begin;

grant usage on schema public to authenticated;
grant select, insert, update on public.boloes to authenticated;
grant select, insert on public.participantes to anon, authenticated;
grant update on public.participantes to authenticated;

alter table public.boloes enable row level security;

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all"
  on public.boloes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "boloes_insert_auth" on public.boloes;
create policy "boloes_insert_auth"
  on public.boloes
  for insert
  to authenticated
  with check (auth.uid() = usuario_id);

drop policy if exists "boloes_update_own" on public.boloes;
create policy "boloes_update_own"
  on public.boloes
  for update
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all"
  on public.participantes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "participantes_insert_all" on public.participantes;
create policy "participantes_insert_all"
  on public.participantes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "participantes_update_owner" on public.participantes;
create policy "participantes_update_owner"
  on public.participantes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.boloes b
      where b.id = participantes.bolao_id
        and b.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.boloes b
      where b.id = participantes.bolao_id
        and b.usuario_id = auth.uid()
    )
  );

-- RPC security definer — mesmo padrão de insert_partidas_para_dono
create or replace function public.insert_bolao_para_usuario(
  p_partida_id bigint,
  p_slug text,
  p_stake numeric,
  p_modo_exclusivo boolean
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
    status
  )
  values (
    p_slug,
    v_uid,
    p_partida_id,
    p_stake,
    p_modo_exclusivo,
    'aberto'
  )
  returning *;
end;
$$;

revoke all on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) from public;
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) to authenticated;

commit;

-- Verificação
select policyname, cmd, roles
from pg_policies
where tablename = 'boloes'
order by policyname;
