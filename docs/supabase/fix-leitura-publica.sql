-- =============================================================================
-- CORREÇÃO: app conecta ao Supabase mas retorna 0 campeonatos
-- Execute TUDO no SQL Editor do painel Supabase (projeto senvrvphcijcnyxvxzbt)
-- =============================================================================

-- 1) Permissões para roles anon e authenticated (necessário além das políticas RLS)
grant usage on schema public to anon, authenticated;

grant select on public.campeonatos to anon, authenticated;
grant select on public.partidas to anon, authenticated;
grant select on public.boloes to anon, authenticated;
grant select on public.participantes to anon, authenticated;

grant insert on public.campeonatos to authenticated;
grant insert on public.partidas to authenticated;

grant insert on public.boloes to authenticated;
grant insert on public.participantes to anon, authenticated;

-- 2) RLS ativo
alter table public.campeonatos enable row level security;
alter table public.partidas enable row level security;
alter table public.boloes enable row level security;
alter table public.participantes enable row level security;
alter table public.profiles enable row level security;

-- 3) Políticas de leitura pública
drop policy if exists "campeonatos_read_all" on public.campeonatos;
create policy "campeonatos_read_all" on public.campeonatos for select using (true);

drop policy if exists "partidas_read_all" on public.partidas;
create policy "partidas_read_all" on public.partidas for select using (true);

drop policy if exists "boloes_read_all" on public.boloes;
create policy "boloes_read_all" on public.boloes for select using (true);

drop policy if exists "participantes_read_all" on public.participantes;
create policy "participantes_read_all" on public.participantes for select using (true);

-- 4) Políticas autenticadas
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "boloes_insert_auth" on public.boloes;
create policy "boloes_insert_auth" on public.boloes for insert with check (auth.uid() = usuario_id);

drop policy if exists "participantes_insert_all" on public.participantes;
create policy "participantes_insert_all" on public.participantes for insert with check (true);

drop policy if exists "campeonatos_insert_auth" on public.campeonatos;
create policy "campeonatos_insert_auth" on public.campeonatos for insert to authenticated with check (true);

drop policy if exists "partidas_insert_auth" on public.partidas;
create policy "partidas_insert_auth" on public.partidas for insert to authenticated with check (true);

-- 5) Verificação (deve retornar pelo menos 1 linha com "Copa do Mundo 2026")
select id, nome, ativo from public.campeonatos order by id;
