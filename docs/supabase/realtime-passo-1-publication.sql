alter table public.participantes replica identity full;
alter table public.boloes replica identity full;
alter table public.partidas replica identity full;

alter publication supabase_realtime add table public.participantes;
alter publication supabase_realtime add table public.partidas;
alter publication supabase_realtime add table public.boloes;
