-- Políticas RLS mínimas para leitura pública (campeonatos/partidas) e escrita autenticada.
-- Execute no SQL Editor se o app conecta mas retorna 0 campeonatos.
-- Preferível: use fix-leitura-publica.sql (inclui GRANTs + verificação).

grant usage on schema public to anon, authenticated;
grant select on public.campeonatos to anon, authenticated;
grant select on public.partidas to anon, authenticated;
grant select on public.boloes to anon, authenticated;
grant select on public.participantes to anon, authenticated;

-- Leitura pública
drop policy if exists "campeonatos_read_all" on public.campeonatos;
create policy "campeonatos_read_all" on public.campeonatos for select using (true);

drop policy if exists "partidas_read_all" on public.partidas;
create policy "partidas_read_all" on public.partidas for select using (true);

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all" on public.boloes for select using (true);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all" on public.participantes for select using (true);

-- Perfis
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Bolões (criar como usuário logado)
drop policy if exists "boloes_insert_auth" on public.boloes;
create policy "boloes_insert_auth" on public.boloes for insert with check (auth.uid() = usuario_id);

-- Participantes
drop policy if exists "participantes_insert_all" on public.participantes;
create policy "participantes_insert_all" on public.participantes for insert with check (true);

-- Campeonatos e partidas personalizados (usuário logado)
grant insert on public.campeonatos to authenticated;
grant insert on public.partidas to authenticated;

drop policy if exists "campeonatos_insert_auth" on public.campeonatos;
create policy "campeonatos_insert_auth" on public.campeonatos for insert to authenticated with check (true);

drop policy if exists "partidas_insert_auth" on public.partidas;
create policy "partidas_insert_auth" on public.partidas for insert to authenticated with check (true);
