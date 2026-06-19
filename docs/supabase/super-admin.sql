begin;

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

grant select on public.super_admins to authenticated;

drop policy if exists "super_admins_select_own_active" on public.super_admins;
create policy "super_admins_select_own_active"
  on public.super_admins
  for select
  to authenticated
  using (user_id = auth.uid() and ativo = true);

-- Cada usuário autenticado só consegue confirmar a própria flag.
-- A lista completa não fica pública.

create index if not exists idx_super_admins_ativo on public.super_admins(ativo);

-- Troque o e-mail abaixo pelo usuário que deve abrir o Painel Administrativo.
insert into public.super_admins (user_id, ativo)
select id, true
from auth.users
where email = 'SEU_EMAIL_AQUI'
on conflict (user_id) do update set ativo = excluded.ativo;

commit;
