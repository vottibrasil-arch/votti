-- Permite leitura pública de ranking_snapshots (GET /ranking/{slug})
-- Escrita continua só via service role (refresh-snapshot).
-- Execute no SQL Editor do Supabase.

grant select on public.ranking_snapshots to anon, authenticated;

drop policy if exists "ranking_snapshots_public_read" on public.ranking_snapshots;
create policy "ranking_snapshots_public_read" on public.ranking_snapshots
  for select to anon, authenticated
  using (true);
