-- =============================================================================
-- Fix RLS/RPC: encerrar bolão com placar final
--
-- Execute este arquivo no SQL Editor do Supabase se aparecer erro ao encerrar:
--   "Execute docs/supabase/fix-bolao-encerrar.sql no Supabase"
-- =============================================================================

begin;

grant usage on schema public to authenticated;
grant select, update on public.boloes to authenticated;
grant select, update on public.partidas to authenticated;

create or replace function public.encerrar_bolao_dono(
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
  v_bolao_id uuid;
  v_partida_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_placar_casa < 0 or p_placar_fora < 0 or p_placar_casa > 20 or p_placar_fora > 20 then
    raise exception 'Placar inválido';
  end if;

  select b.id, b.partida_id
    into v_bolao_id, v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug
    and b.usuario_id = v_uid;

  if v_bolao_id is null or v_partida_id is null then
    raise exception 'Bolão não encontrado ou sem permissão';
  end if;

  update public.partidas
     set placar_casa = p_placar_casa,
         placar_fora = p_placar_fora,
         status = case
           when exists (
             select 1
               from public.boloes b2
              where b2.partida_id = v_partida_id
                and b2.id <> v_bolao_id
                and b2.status = 'ao_vivo'
           ) then status
           else 'encerrado'
         end
   where id = v_partida_id;

  update public.boloes
     set status = 'encerrado'
   where id = v_bolao_id;
end;
$$;

revoke all on function public.encerrar_bolao_dono(text, integer, integer) from public;
grant execute on function public.encerrar_bolao_dono(text, integer, integer) to authenticated;

-- Sincroniza bolões quando a partida é encerrada (corrige dados antigos e updates manuais).
update public.boloes b
   set status = 'encerrado'
  from public.partidas p
 where b.partida_id = p.id
   and p.status = 'encerrado'
   and b.status <> 'encerrado';

create or replace function public.sync_boloes_quando_partida_encerra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'encerrado' and (old.status is distinct from new.status) then
    update public.boloes
       set status = 'encerrado'
     where partida_id = new.id
       and status = 'ao_vivo';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_boloes_partida_encerrada on public.partidas;
create trigger trg_sync_boloes_partida_encerrada
  after update of status on public.partidas
  for each row
  execute function public.sync_boloes_quando_partida_encerra();

commit;
