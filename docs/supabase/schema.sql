-- Palpite Gol — schema alinhado ao Supabase do projeto
-- Execute no SQL Editor (banco zerado)

create extension if not exists "pgcrypto";

-- Perfil do usuário (vinculado ao auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

-- Campeonatos
create table if not exists public.campeonatos (
  id bigint generated always as identity primary key,
  nome text not null,
  api_league_id integer,
  ativo boolean not null default true,
  owner_id uuid references auth.users(id) on delete set null,
  tipo text not null default 'personalizado' check (tipo in ('oficial', 'personalizado')),
  banner_url text,
  descricao text,
  created_at timestamptz not null default now(),
  constraint campeonatos_oficial_sem_owner check (
    (tipo = 'oficial' and owner_id is null) or tipo = 'personalizado'
  ),
  constraint campeonatos_personalizado_com_owner check (
    tipo <> 'personalizado' or owner_id is not null
  )
);

-- Partidas
create table if not exists public.partidas (
  id bigint generated always as identity primary key,
  campeonato_id bigint references public.campeonatos(id),
  time_casa text not null,
  time_fora text not null,
  placar_casa integer not null default 0,
  placar_fora integer not null default 0,
  status text not null default 'agendado',
  data_partida timestamptz,
  created_at timestamptz not null default now()
);

-- Bolões
create table if not exists public.boloes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id),
  partida_id bigint references public.partidas(id),
  slug text unique not null,
  stake numeric not null default 10,
  modo_exclusivo boolean not null default true,
  cobra_taxa boolean not null default false,
  status text not null default 'aberto',
  created_at timestamptz not null default now()
);

-- Participantes
create table if not exists public.participantes (
  id uuid primary key default gen_random_uuid(),
  bolao_id uuid references public.boloes(id) on delete cascade,
  nome text not null,
  cidade text,
  palpite_casa integer not null,
  palpite_fora integer not null,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_campeonatos_owner_id on public.campeonatos(owner_id);
create index if not exists idx_campeonatos_tipo on public.campeonatos(tipo);
create index if not exists idx_boloes_slug on public.boloes(slug);
create index if not exists idx_boloes_usuario on public.boloes(usuario_id);
create index if not exists idx_participantes_bolao on public.participantes(bolao_id);
create index if not exists idx_partidas_campeonato on public.partidas(campeonato_id);

-- RLS (ajuste antes de produção)
alter table public.profiles enable row level security;
alter table public.campeonatos enable row level security;
alter table public.partidas enable row level security;
alter table public.boloes enable row level security;
alter table public.participantes enable row level security;

create policy "campeonatos_select_oficial" on public.campeonatos for select to anon, authenticated using (tipo = 'oficial' and ativo = true);
create policy "campeonatos_select_own" on public.campeonatos for select to authenticated using (tipo = 'personalizado' and owner_id = auth.uid());
create policy "campeonatos_insert_personalizado" on public.campeonatos for insert to authenticated with check (tipo = 'personalizado' and owner_id = auth.uid());
create policy "campeonatos_update_own" on public.campeonatos for update to authenticated using (tipo = 'personalizado' and owner_id = auth.uid()) with check (tipo = 'personalizado' and owner_id = auth.uid());
create policy "partidas_select_all" on public.partidas for select to anon, authenticated using (true);
create policy "partidas_insert_own_campeonato" on public.partidas for insert to authenticated with check (
  exists (select 1 from public.campeonatos c where c.id = campeonato_id and c.tipo = 'personalizado' and c.owner_id = auth.uid())
);
create policy "boloes_read_all" on public.boloes for select using (true);
create policy "participantes_read_all" on public.participantes for select using (true);
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "boloes_insert_auth" on public.boloes for insert with check (auth.uid() = usuario_id);
create policy "participantes_insert_all" on public.participantes for insert with check (true);
