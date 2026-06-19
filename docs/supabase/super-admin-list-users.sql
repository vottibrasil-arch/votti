begin;

create or replace function public.super_admin_list_users()
returns table (
  id uuid,
  email text,
  nome text,
  created_at timestamptz,
  is_super_admin boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(trim(p.nome), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(u.email, '@', 1), '')
    ) as nome,
    coalesce(p.created_at, u.created_at) as created_at,
    exists (
      select 1
      from public.super_admins sa2
      where sa2.user_id = u.id and sa2.ativo = true
    ) as is_super_admin
  from auth.users u
  left join public.profiles p on p.id = u.id
  where exists (
    select 1
    from public.super_admins sa
    where sa.user_id = auth.uid() and sa.ativo = true
  )
  order by u.created_at desc;
$$;

revoke all on function public.super_admin_list_users() from public;
grant execute on function public.super_admin_list_users() to authenticated;

commit;
