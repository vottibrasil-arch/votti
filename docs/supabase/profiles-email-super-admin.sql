begin;

alter table public.profiles
  add column if not exists email text;

drop policy if exists "profiles_read_super_admin" on public.profiles;
create policy "profiles_read_super_admin"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.user_id = auth.uid() and sa.ativo = true
    )
  );

-- Preenche nome e e-mail dos criadores de bolão já existentes.
insert into public.profiles (id, nome, email)
select
  u.id,
  coalesce(
    nullif(trim(p.nome), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  ) as nome,
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where exists (
  select 1 from public.boloes b where b.usuario_id = u.id
)
on conflict (id) do update
set
  email = coalesce(excluded.email, public.profiles.email),
  nome = coalesce(nullif(trim(public.profiles.nome), ''), excluded.nome);

commit;
