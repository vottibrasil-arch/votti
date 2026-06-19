-- =============================================================================
-- PALPITE GOL — rode no Supabase SQL Editor (um bloco por vez, na ordem)
-- Não precisa abrir arquivos no PC — copie daqui ou do chat
-- =============================================================================

-- ========== BLOCO 1 — colunas que faltam ==========
alter table public.campeonatos add column if not exists escudo_url text;
alter table public.campeonatos add column if not exists cidade text;
alter table public.campeonatos add column if not exists data_inicio timestamptz;
alter table public.campeonatos add column if not exists data_fim timestamptz;
alter table public.campeonatos add column if not exists apostas_abertas boolean not null default true;

alter table public.partidas add column if not exists fase text;
alter table public.partidas add column if not exists escudo_casa text;
alter table public.partidas add column if not exists escudo_fora text;
alter table public.partidas add column if not exists ordem integer;

alter table public.boloes add column if not exists campeonato_id bigint references public.campeonatos(id) on delete cascade;

create index if not exists idx_partidas_campeonato_ordem on public.partidas (campeonato_id, ordem);
create index if not exists idx_boloes_campeonato on public.boloes(campeonato_id);


-- ========== BLOCO 2 — RPCs por link (corrige erro 42P13) ==========
begin;

drop function if exists public.get_campeonato_por_link(text);
drop function if exists public.get_partidas_por_link(text);

create function public.get_campeonato_por_link(p_slug text)
returns table (
  id bigint, nome text, tipo text, owner_id uuid, slug text,
  banner_url text, escudo_url text, descricao text, cidade text,
  data_inicio timestamptz, data_fim timestamptz, ativo boolean, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.nome, c.tipo, c.owner_id, c.slug,
    c.banner_url, c.escudo_url, c.descricao, c.cidade,
    c.data_inicio, c.data_fim, c.ativo, c.created_at
  from public.campeonatos c
  where c.tipo = 'personalizado' and c.ativo = true and c.slug = p_slug
  limit 1;
$$;

create function public.get_partidas_por_link(p_slug text)
returns setof public.partidas
language sql stable security definer set search_path = public
as $$
  select p.*
  from public.partidas p
  inner join public.campeonatos c on c.id = p.campeonato_id
  where c.tipo = 'personalizado' and c.ativo = true and c.slug = p_slug
  order by p.ordem nulls last, p.data_partida nulls last, p.id;
$$;

revoke all on function public.get_campeonato_por_link(text) from public;
revoke all on function public.get_partidas_por_link(text) from public;
grant execute on function public.get_campeonato_por_link(text) to anon, authenticated;
grant execute on function public.get_partidas_por_link(text) to anon, authenticated;

commit;


-- ========== BLOCO 3 — RLS partidas + RPC insert jogos ==========
begin;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partidas to authenticated;
grant select on public.partidas to anon;

create or replace function public.is_partida_campeonato_owner(p_campeonato_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campeonatos c
    where c.id = p_campeonato_id
      and c.tipo = 'personalizado'
      and c.owner_id = auth.uid()
  );
$$;

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

alter table public.partidas enable row level security;

create policy "partidas_select_oficial" on public.partidas for select to anon, authenticated
  using (exists (select 1 from public.campeonatos c where c.id = campeonato_id and c.tipo = 'oficial'));

create policy "partidas_select_own" on public.partidas for select to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_select_via_bolao" on public.partidas for select to anon, authenticated
  using (exists (select 1 from public.boloes b where b.partida_id = partidas.id));

create policy "partidas_insert_owner" on public.partidas for insert to authenticated
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_update_owner" on public.partidas for update to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id))
  with check (public.is_partida_campeonato_owner(campeonato_id));

create policy "partidas_delete_owner" on public.partidas for delete to authenticated
  using (public.is_partida_campeonato_owner(campeonato_id));

create or replace function public.insert_partidas_para_dono(p_campeonato_id bigint, p_partidas jsonb)
returns setof public.partidas language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  if not exists (
    select 1 from public.campeonatos c
    where c.id = p_campeonato_id and c.tipo = 'personalizado' and c.owner_id = auth.uid()
  ) then raise exception 'Acesso negado: você não é o dono deste campeonato'; end if;

  return query
  insert into public.partidas (campeonato_id, time_casa, time_fora, fase, escudo_casa, escudo_fora, ordem, status, data_partida)
  select p_campeonato_id, x.time_casa, x.time_fora,
    nullif(trim(x.fase), ''), nullif(trim(x.escudo_casa), ''), nullif(trim(x.escudo_fora), ''),
    coalesce(x.ordem, 0), coalesce(nullif(trim(x.status), ''), 'agendado'),
    case when x.data_partida is null or trim(x.data_partida) = '' then null else x.data_partida::timestamptz end
  from jsonb_to_recordset(p_partidas) as x(
    time_casa text, time_fora text, fase text, escudo_casa text, escudo_fora text,
    ordem integer, status text, data_partida text
  )
  returning *;
end;
$$;

revoke all on function public.insert_partidas_para_dono(bigint, jsonb) from public;
grant execute on function public.insert_partidas_para_dono(bigint, jsonb) to authenticated;

commit;


-- ========== BLOCO 4 — excluir campeonato ==========
begin;

grant delete on public.campeonatos to authenticated;

drop policy if exists "campeonatos_delete_own" on public.campeonatos;
create policy "campeonatos_delete_own" on public.campeonatos for delete to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid());

create or replace function public.delete_campeonato_para_dono(p_slug text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_camp_id bigint;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  select c.id into v_camp_id from public.campeonatos c
  where c.slug = p_slug and c.tipo = 'personalizado' and c.owner_id = v_uid;
  if v_camp_id is null then raise exception 'Campeonato não encontrado ou sem permissão'; end if;

  delete from public.participantes where bolao_id in (
    select b.id from public.boloes b
    where b.campeonato_id = v_camp_id or b.partida_id in (select p.id from public.partidas p where p.campeonato_id = v_camp_id)
  );
  delete from public.boloes where campeonato_id = v_camp_id
    or partida_id in (select p.id from public.partidas p where p.campeonato_id = v_camp_id);
  delete from public.partidas where campeonato_id = v_camp_id;
  delete from public.campeonatos where id = v_camp_id;
end;
$$;

revoke all on function public.delete_campeonato_para_dono(text) from public;
grant execute on function public.delete_campeonato_para_dono(text) to authenticated;

commit;


-- ========== BLOCO 5 — storage imagens ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campeonatos-media', 'campeonatos-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "campeonatos_media_public_read" on storage.objects;
create policy "campeonatos_media_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'campeonatos-media');

drop policy if exists "campeonatos_media_auth_upload" on storage.objects;
create policy "campeonatos_media_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'campeonatos-media'
    and (storage.foldername(name))[1] in ('banners', 'escudos', 'logos', 'times')
    and auth.uid()::text = (storage.foldername(name))[2]);

drop policy if exists "campeonatos_media_auth_update" on storage.objects;
create policy "campeonatos_media_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'campeonatos-media' and auth.uid()::text = (storage.foldername(name))[2]);

drop policy if exists "campeonatos_media_auth_delete" on storage.objects;
create policy "campeonatos_media_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'campeonatos-media' and auth.uid()::text = (storage.foldername(name))[2]);


-- ========== BLOCO 6 — bolões ==========
begin;

grant usage on schema public to authenticated;
grant select, insert, update on public.boloes to authenticated;
grant select, insert on public.participantes to anon, authenticated;

alter table public.boloes enable row level security;

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all" on public.boloes for select to anon, authenticated using (true);

drop policy if exists "boloes_insert_auth" on public.boloes;
create policy "boloes_insert_auth" on public.boloes for insert to authenticated
  with check (auth.uid() = usuario_id);

drop policy if exists "boloes_update_own" on public.boloes;
create policy "boloes_update_own" on public.boloes for update to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all" on public.participantes for select to anon, authenticated using (true);

drop policy if exists "participantes_insert_all" on public.participantes;
create policy "participantes_insert_all" on public.participantes for insert to anon, authenticated with check (true);

create or replace function public.insert_bolao_para_usuario(
  p_partida_id bigint, p_slug text, p_stake numeric, p_modo_exclusivo boolean
)
returns setof public.boloes language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if not exists (
    select 1 from public.partidas p join public.campeonatos c on c.id = p.campeonato_id
    where p.id = p_partida_id and (c.tipo = 'oficial' or (c.tipo = 'personalizado' and c.owner_id = v_uid))
  ) then raise exception 'Partida não encontrada ou sem permissão'; end if;

  return query
  insert into public.boloes (slug, usuario_id, partida_id, stake, modo_exclusivo, status)
  values (p_slug, v_uid, p_partida_id, p_stake, p_modo_exclusivo, 'aberto')
  returning *;
end;
$$;

revoke all on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) from public;
grant execute on function public.insert_bolao_para_usuario(bigint, text, numeric, boolean) to authenticated;

commit;
