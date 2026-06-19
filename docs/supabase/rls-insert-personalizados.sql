-- Políticas RLS para campeonatos personalizados com owner_id
-- Execute após migration-campeonatos-owner.sql (ou use a migration completa)

grant usage on schema public to authenticated;
grant insert, update on public.campeonatos to authenticated;
grant insert on public.partidas to authenticated;

drop policy if exists "campeonatos_read_all" on public.campeonatos;
drop policy if exists "campeonatos_insert_auth" on public.campeonatos;
drop policy if exists "campeonatos_select_oficial" on public.campeonatos;
drop policy if exists "campeonatos_select_own" on public.campeonatos;
drop policy if exists "campeonatos_insert_personalizado" on public.campeonatos;
drop policy if exists "campeonatos_update_own" on public.campeonatos;

create policy "campeonatos_select_oficial"
  on public.campeonatos for select to anon, authenticated
  using (tipo = 'oficial' and ativo = true);

create policy "campeonatos_select_own"
  on public.campeonatos for select to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid());

create policy "campeonatos_insert_personalizado"
  on public.campeonatos for insert to authenticated
  with check (tipo = 'personalizado' and owner_id = auth.uid());

create policy "campeonatos_update_own"
  on public.campeonatos for update to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid())
  with check (tipo = 'personalizado' and owner_id = auth.uid());

drop policy if exists "partidas_read_all" on public.partidas;
drop policy if exists "partidas_insert_auth" on public.partidas;
drop policy if exists "partidas_select_all" on public.partidas;
drop policy if exists "partidas_insert_own_campeonato" on public.partidas;

create policy "partidas_select_all"
  on public.partidas for select to anon, authenticated using (true);

create policy "partidas_insert_own_campeonato"
  on public.partidas for insert to authenticated
  with check (
    exists (
      select 1 from public.campeonatos c
      where c.id = campeonato_id
        and c.tipo = 'personalizado'
        and c.owner_id = auth.uid()
    )
  );
