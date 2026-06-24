begin;

-- Garante RLS e permissões mínimas para rota pública /apoiar.
alter table public.apoiadores enable row level security;
grant select, insert on public.apoiadores to anon, authenticated;

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
  with check (
    coalesce(length(trim(nome)), 0) between 2 and 80
    and (cidade is null or length(trim(cidade)) <= 80)
    and (mensagem is null or length(trim(mensagem)) <= 18)
    and valor > 0
    and status in ('ativo', 'pendente', 'inativo')
  );

commit;
