-- =============================================================================
-- Migration: editar e excluir campeonato personalizado (RLS + RPC em cascata)
-- Execute no SQL Editor do Supabase
-- =============================================================================

begin;

grant delete on public.campeonatos to authenticated;

drop policy if exists "campeonatos_delete_own" on public.campeonatos;
create policy "campeonatos_delete_own"
  on public.campeonatos
  for delete
  to authenticated
  using (tipo = 'personalizado' and owner_id = auth.uid());

-- Exclui campeonato, partidas, bolões e participantes vinculados (security definer)
create or replace function public.delete_campeonato_para_dono(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_camp_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select c.id into v_camp_id
  from public.campeonatos c
  where c.slug = p_slug
    and c.tipo = 'personalizado'
    and c.owner_id = v_uid;

  if v_camp_id is null then
    raise exception 'Campeonato não encontrado ou sem permissão';
  end if;

  delete from public.participantes
  where bolao_id in (
    select b.id
    from public.boloes b
    where b.campeonato_id = v_camp_id
       or b.partida_id in (
         select p.id from public.partidas p where p.campeonato_id = v_camp_id
       )
  );

  delete from public.boloes
  where campeonato_id = v_camp_id
     or partida_id in (
       select p.id from public.partidas p where p.campeonato_id = v_camp_id
     );

  delete from public.partidas where campeonato_id = v_camp_id;
  delete from public.campeonatos where id = v_camp_id;
end;
$$;

revoke all on function public.delete_campeonato_para_dono(text) from public;
grant execute on function public.delete_campeonato_para_dono(text) to authenticated;

commit;
