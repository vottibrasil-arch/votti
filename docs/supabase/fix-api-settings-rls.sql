-- Corrige RLS de api_settings (e app_settings usada pelo código do Super ADM).
-- Rode no SQL Editor do Supabase após super-admin.sql e apoiadores.sql.
--
-- Problema: upsert bloqueado porque
--   1) não havia políticas INSERT/UPDATE para Super ADM; e
--   2) o backend sem SERVICE_ROLE usa chave anon (auth.uid() = null).
--
-- Solução: políticas RLS para Super ADM autenticado + RPC security definer opcional.

begin;

-- ---------------------------------------------------------------------------
-- Helper reutilizável
-- ---------------------------------------------------------------------------

create or replace function public.is_active_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.super_admins sa
    where sa.user_id = auth.uid()
      and sa.ativo = true
  );
$$;

revoke all on function public.is_active_super_admin() from public;
grant execute on function public.is_active_super_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- api_settings — configurações sensíveis (ex.: chaves de API no painel)
-- ---------------------------------------------------------------------------

create table if not exists public.api_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.api_settings enable row level security;

grant select, insert, update on public.api_settings to authenticated;

drop policy if exists "api_settings_super_admin_select" on public.api_settings;
create policy "api_settings_super_admin_select"
  on public.api_settings
  for select
  to authenticated
  using (public.is_active_super_admin());

drop policy if exists "api_settings_super_admin_insert" on public.api_settings;
create policy "api_settings_super_admin_insert"
  on public.api_settings
  for insert
  to authenticated
  with check (public.is_active_super_admin());

drop policy if exists "api_settings_super_admin_update" on public.api_settings;
create policy "api_settings_super_admin_update"
  on public.api_settings
  for update
  to authenticated
  using (public.is_active_super_admin())
  with check (public.is_active_super_admin());

-- ---------------------------------------------------------------------------
-- app_settings — configurações públicas do app (ex.: propaganda no rodapé)
-- ---------------------------------------------------------------------------

grant insert, update on public.app_settings to authenticated;

drop policy if exists "app_settings_super_admin_select" on public.app_settings;
create policy "app_settings_super_admin_select"
  on public.app_settings
  for select
  to authenticated
  using (public.is_active_super_admin());

drop policy if exists "app_settings_super_admin_insert" on public.app_settings;
create policy "app_settings_super_admin_insert"
  on public.app_settings
  for insert
  to authenticated
  with check (public.is_active_super_admin());

drop policy if exists "app_settings_super_admin_update" on public.app_settings;
create policy "app_settings_super_admin_update"
  on public.app_settings
  for update
  to authenticated
  using (public.is_active_super_admin())
  with check (public.is_active_super_admin());

-- Leitura pública da flag do rodapé (mantém comportamento anterior)
drop policy if exists "app_settings_select_propaganda" on public.app_settings;
create policy "app_settings_select_propaganda"
  on public.app_settings
  for select
  to anon, authenticated
  using (key = 'propaganda_rodape_visivel');

-- ---------------------------------------------------------------------------
-- RPC — upsert seguro (valida Super ADM dentro do banco)
-- ---------------------------------------------------------------------------

create or replace function public.super_admin_upsert_api_setting(
  p_key text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value jsonb;
begin
  if not public.is_active_super_admin() then
    raise exception 'Sem permissão de Super ADM'
      using errcode = '42501';
  end if;

  insert into public.api_settings as s (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at
  returning s.value into v_value;

  return v_value;
end;
$$;

create or replace function public.super_admin_upsert_app_setting(
  p_key text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value jsonb;
begin
  if not public.is_active_super_admin() then
    raise exception 'Sem permissão de Super ADM'
      using errcode = '42501';
  end if;

  insert into public.app_settings as s (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at
  returning s.value into v_value;

  return v_value;
end;
$$;

revoke all on function public.super_admin_upsert_api_setting(text, jsonb) from public;
revoke all on function public.super_admin_upsert_app_setting(text, jsonb) from public;
grant execute on function public.super_admin_upsert_api_setting(text, jsonb) to authenticated;
grant execute on function public.super_admin_upsert_app_setting(text, jsonb) to authenticated;

commit;
