begin;

grant usage on schema public to authenticated;
grant select, update on public.boloes to authenticated;
grant select, update on public.partidas to authenticated;

create or replace function public.reabrir_bolao_ao_vivo_dono(
  p_bolao_slug text
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

  select b.id, b.partida_id
    into v_bolao_id, v_partida_id
  from public.boloes b
  where b.slug = p_bolao_slug
    and b.usuario_id = v_uid;

  if v_bolao_id is null or v_partida_id is null then
    raise exception 'Bolão não encontrado ou sem permissão';
  end if;

  update public.partidas
     set status = 'ao_vivo'
   where id = v_partida_id;

  update public.boloes
     set status = 'ao_vivo'
   where id = v_bolao_id;
end;
$$;

revoke all on function public.reabrir_bolao_ao_vivo_dono(text) from public;
grant execute on function public.reabrir_bolao_ao_vivo_dono(text) to authenticated;

commit;
