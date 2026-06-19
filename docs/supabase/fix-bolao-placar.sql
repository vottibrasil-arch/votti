-- =============================================================================
-- Fix RLS/RPC: salvar placar ao vivo do bolão
--
-- Execute este arquivo no SQL Editor do Supabase quando aparecer erro ao salvar:
--   "Execute docs/supabase/fix-bolao-placar.sql no Supabase"
-- =============================================================================

begin;

grant usage on schema public to authenticated;
grant select on public.boloes to authenticated;
grant select, update on public.partidas to authenticated;

create or replace function public.update_bolao_placar_dono(
  p_bolao_slug text,
  p_placar_casa integer,
  p_placar_fora integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partida_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_placar_casa < 0 or p_placar_fora < 0 or p_placar_casa > 20 or p_placar_fora > 20 then
    raise exception 'Placar inválido';
  end if;

  select b.partida_id
    into v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug
    and b.usuario_id = v_uid;

  if v_partida_id is null then
    raise exception 'Bolão não encontrado ou sem permissão';
  end if;

  update public.partidas
     set placar_casa = p_placar_casa,
         placar_fora = p_placar_fora,
         status = 'ao_vivo'
   where id = v_partida_id;

  if not found then
    raise exception 'Partida do bolão não encontrada';
  end if;
end;
$$;

revoke all on function public.update_bolao_placar_dono(text, integer, integer) from public;
grant execute on function public.update_bolao_placar_dono(text, integer, integer) to authenticated;

commit;
