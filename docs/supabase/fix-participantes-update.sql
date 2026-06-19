-- =============================================================================
-- Fix RLS: aprovar/rejeitar participantes do bolão
--
-- Execute este arquivo no SQL Editor do Supabase quando aparecer erro ao aprovar:
--   "O Supabase bloqueou a aprovação por falta de UPDATE em participantes"
-- =============================================================================

begin;

grant usage on schema public to authenticated;
grant select, update on public.participantes to authenticated;
grant select on public.boloes to authenticated;

alter table public.participantes enable row level security;

drop policy if exists "participantes_update_owner" on public.participantes;
create policy "participantes_update_owner"
  on public.participantes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.boloes b
      where b.id = participantes.bolao_id
        and b.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.boloes b
      where b.id = participantes.bolao_id
        and b.usuario_id = auth.uid()
    )
  );

create or replace function public.update_participante_status_dono(
  p_bolao_slug text,
  p_participante_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bolao_id uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_status not in ('aprovado', 'rejeitado') then
    raise exception 'Status inválido';
  end if;

  select b.id
    into v_bolao_id
  from public.boloes b
  where b.slug = p_bolao_slug
    and b.usuario_id = v_uid;

  if v_bolao_id is null then
    raise exception 'Bolão não encontrado ou sem permissão';
  end if;

  update public.participantes
     set status = p_status
   where id = p_participante_id
     and bolao_id = v_bolao_id;

  if not found then
    raise exception 'Participante não encontrado neste bolão';
  end if;
end;
$$;

revoke all on function public.update_participante_status_dono(text, uuid, text) from public;
grant execute on function public.update_participante_status_dono(text, uuid, text) to authenticated;

commit;

-- Verificação
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'participantes'
order by policyname;
