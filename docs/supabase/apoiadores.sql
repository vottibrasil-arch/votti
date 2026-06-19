begin;

create table if not exists public.apoiadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  mensagem text,
  valor numeric not null default 10 check (valor > 0),
  status text not null default 'ativo' check (status in ('ativo', 'pendente', 'inativo')),
  created_at timestamptz not null default now()
);

create index if not exists idx_apoiadores_status on public.apoiadores(status);
create index if not exists idx_apoiadores_created_at on public.apoiadores(created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('propaganda_rodape_visivel', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.apoiadores enable row level security;
alter table public.app_settings enable row level security;

grant select on public.apoiadores to anon, authenticated;
grant insert on public.apoiadores to anon, authenticated;
grant select on public.app_settings to anon, authenticated;

drop policy if exists "apoiadores_select_ativos" on public.apoiadores;
create policy "apoiadores_select_ativos"
  on public.apoiadores
  for select
  to anon, authenticated
  using (status = 'ativo');

drop policy if exists "apoiadores_insert_public" on public.apoiadores;
create policy "apoiadores_insert_public"
  on public.apoiadores
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "app_settings_select_propaganda" on public.app_settings;
create policy "app_settings_select_propaganda"
  on public.app_settings
  for select
  to anon, authenticated
  using (key = 'propaganda_rodape_visivel');

commit;
