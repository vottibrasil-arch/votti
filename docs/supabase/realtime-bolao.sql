begin;

-- Habilita Supabase Realtime nas tabelas usadas pelo bolão ao vivo.
alter publication supabase_realtime add table public.participantes;
alter publication supabase_realtime add table public.partidas;
alter publication supabase_realtime add table public.boloes;

commit;
