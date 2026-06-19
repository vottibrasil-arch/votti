alter table public.partidas enable row level security;
alter table public.boloes enable row level security;
alter table public.participantes enable row level security;

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all" on public.boloes for select to anon, authenticated using (true);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all" on public.participantes for select to anon, authenticated using (true);

drop policy if exists "partidas_select_via_bolao" on public.partidas;
create policy "partidas_select_via_bolao" on public.partidas for select to anon, authenticated
using (exists (select 1 from public.boloes b where b.partida_id = partidas.id));

drop policy if exists "partidas_read_all" on public.partidas;
create policy "partidas_read_all" on public.partidas for select to anon, authenticated using (true);
