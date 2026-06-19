-- =============================================================================
-- Palpite Gol — Realtime seguro (bolão ao vivo + admin)
-- Cole e execute TUDO de uma vez no SQL Editor do Supabase.
-- Usa $body$ em vez de $$ para evitar erro de parsing ao colar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOCO A — Permissões + RLS + REPLICA IDENTITY
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.partidas to anon, authenticated;
grant select on public.boloes to anon, authenticated;
grant select on public.participantes to anon, authenticated;

grant insert on public.participantes to anon, authenticated;
grant insert, update, delete on public.boloes to authenticated;
grant update on public.participantes to authenticated;
grant select, insert, update, delete on public.partidas to authenticated;

alter table public.partidas enable row level security;
alter table public.boloes enable row level security;
alter table public.participantes enable row level security;

create or replace function public.is_partida_campeonato_owner(p_campeonato_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select exists (
    select 1
    from public.campeonatos c
    where c.id = p_campeonato_id
      and c.tipo = 'personalizado'
      and c.owner_id = auth.uid()
  );
$body$;

revoke all on function public.is_partida_campeonato_owner(bigint) from public;
grant execute on function public.is_partida_campeonato_owner(bigint) to authenticated;

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

create policy "partidas_select_oficial"
  on public.partidas for select to anon, authenticated
  using (
    exists (
      select 1 from public.campeonatos c
      where c.id = campeonato_id and c.tipo = 'oficial'
    )
  );

create policy "partidas_select_own"
  on public.partidas for select to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_select_via_bolao"
  on public.partidas for select to anon, authenticated
  using (
    exists (
      select 1 from public.boloes b where b.partida_id = partidas.id
    )
  );

create policy "partidas_insert_owner"
  on public.partidas for insert to authenticated
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_update_owner"
  on public.partidas for update to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id))
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_delete_owner"
  on public.partidas for delete to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all"
  on public.boloes for select to anon, authenticated using (true);

drop policy if exists "boloes_insert_auth" on public.boloes;
create policy "boloes_insert_auth"
  on public.boloes for insert to authenticated
  with check (auth.uid() = usuario_id);

drop policy if exists "boloes_update_own" on public.boloes;
create policy "boloes_update_own"
  on public.boloes for update to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "boloes_delete_own" on public.boloes;
create policy "boloes_delete_own"
  on public.boloes for delete to authenticated
  using (auth.uid() = usuario_id);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all"
  on public.participantes for select to anon, authenticated using (true);

drop policy if exists "participantes_insert_all" on public.participantes;
create policy "participantes_insert_all"
  on public.participantes for insert to anon, authenticated with check (true);

drop policy if exists "participantes_update_owner" on public.participantes;
create policy "participantes_update_owner"
  on public.participantes for update to authenticated
  using (
    exists (
      select 1 from public.boloes b
      where b.id = participantes.bolao_id and b.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.boloes b
      where b.id = participantes.bolao_id and b.usuario_id = auth.uid()
    )
  );

alter table public.participantes replica identity full;
alter table public.boloes replica identity full;
alter table public.partidas replica identity full;

alter table public.boloes
  add column if not exists taxa_percent numeric(5, 2) not null default 0;

-- -----------------------------------------------------------------------------
-- BLOCO B — RPCs (uma função por vez, delimitador $body$)
-- -----------------------------------------------------------------------------

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
as $body$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
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
    raise exception 'Partida nao encontrada ou sem permissao';
  end if;

  return query
  insert into public.boloes (
    slug, usuario_id, partida_id, stake, modo_exclusivo, taxa_percent, status
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
$body$;

revoke all on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, numeric) from public;
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean, numeric) to authenticated;

create or replace function public.update_participante_status_dono(
  p_bolao_slug text,
  p_participante_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_uid uuid := auth.uid();
  v_bolao_id uuid;
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if p_status not in ('aprovado', 'rejeitado') then
    raise exception 'Status invalido';
  end if;

  select b.id into v_bolao_id
  from public.boloes b
  where b.slug = p_bolao_slug and b.usuario_id = v_uid;

  if v_bolao_id is null then
    raise exception 'Bolao nao encontrado ou sem permissao';
  end if;

  update public.participantes
  set status = p_status
  where id = p_participante_id and bolao_id = v_bolao_id;

  if not found then
    raise exception 'Participante nao encontrado neste bolao';
  end if;
end;
$body$;

revoke all on function public.update_participante_status_dono(text, uuid, text) from public;
grant execute on function public.update_participante_status_dono(text, uuid, text) to authenticated;

create or replace function public.update_bolao_placar_dono(
  p_bolao_slug text,
  p_placar_casa integer,
  p_placar_fora integer
)
returns void
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_uid uuid := auth.uid();
  v_partida_id bigint;
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if p_placar_casa < 0 or p_placar_fora < 0 or p_placar_casa > 20 or p_placar_fora > 20 then
    raise exception 'Placar invalido';
  end if;

  select b.partida_id into v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug and b.usuario_id = v_uid;

  if v_partida_id is null then
    raise exception 'Bolao nao encontrado ou sem permissao';
  end if;

  update public.partidas
  set placar_casa = p_placar_casa,
      placar_fora = p_placar_fora,
      status = 'ao_vivo'
  where id = v_partida_id;

  if not found then
    raise exception 'Partida do bolao nao encontrada';
  end if;
end;
$body$;

revoke all on function public.update_bolao_placar_dono(text, integer, integer) from public;
grant execute on function public.update_bolao_placar_dono(text, integer, integer) to authenticated;

create or replace function public.encerrar_bolao_dono(
  p_bolao_slug text,
  p_placar_casa integer,
  p_placar_fora integer
)
returns void
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_uid uuid := auth.uid();
  v_bolao_id uuid;
  v_partida_id bigint;
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if p_placar_casa < 0 or p_placar_fora < 0 or p_placar_casa > 20 or p_placar_fora > 20 then
    raise exception 'Placar invalido';
  end if;

  select b.id, b.partida_id into v_bolao_id, v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug and b.usuario_id = v_uid;

  if v_bolao_id is null or v_partida_id is null then
    raise exception 'Bolao nao encontrado ou sem permissao';
  end if;

  update public.partidas
  set placar_casa = p_placar_casa,
      placar_fora = p_placar_fora,
      status = 'encerrado'
  where id = v_partida_id;

  update public.boloes set status = 'encerrado' where id = v_bolao_id;
end;
$body$;

revoke all on function public.encerrar_bolao_dono(text, integer, integer) from public;
grant execute on function public.encerrar_bolao_dono(text, integer, integer) to authenticated;

create or replace function public.reabrir_bolao_ao_vivo_dono(p_bolao_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_uid uuid := auth.uid();
  v_bolao_id uuid;
  v_partida_id bigint;
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  select b.id, b.partida_id into v_bolao_id, v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug and b.usuario_id = v_uid;

  if v_bolao_id is null or v_partida_id is null then
    raise exception 'Bolao nao encontrado ou sem permissao';
  end if;

  update public.partidas set status = 'ao_vivo' where id = v_partida_id;
  update public.boloes set status = 'ao_vivo' where id = v_bolao_id;
end;
$body$;

revoke all on function public.reabrir_bolao_ao_vivo_dono(text) from public;
grant execute on function public.reabrir_bolao_ao_vivo_dono(text) to authenticated;

-- -----------------------------------------------------------------------------
-- BLOCO C — Realtime publication (rode linha a linha se der erro de duplicata)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.participantes;
alter publication supabase_realtime add table public.partidas;
alter publication supabase_realtime add table public.boloes;

-- -----------------------------------------------------------------------------
-- BLOCO D — Verificacao
-- -----------------------------------------------------------------------------
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('boloes', 'participantes', 'partidas')
order by tablename, policyname;

select tablename from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('boloes', 'participantes', 'partidas')
order by tablename;
