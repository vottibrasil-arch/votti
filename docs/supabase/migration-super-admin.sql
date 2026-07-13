-- VOTTII — Super Admin (app_settings + profiles)
-- Super admin inicial: vottibrasil@gmail.com
-- Rode no SQL Editor do Supabase (pode executar de novo).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'Organizador'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, nome)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'nome', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(u.email, '@', 1),
    'Organizador'
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  (
    'signup',
    jsonb_build_object(
      'open', true,
      'max_users', null,
      'message', 'Cadastro temporariamente fechado. Tente novamente mais tarde.'
    )
  ),
  (
    'super_admin',
    jsonb_build_object(
      'emails', jsonb_build_array('vottibrasil@gmail.com')
    )
  )
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_no_public" on public.app_settings;
create policy "app_settings_no_public" on public.app_settings
  for all to anon, authenticated
  using (false)
  with check (false);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
