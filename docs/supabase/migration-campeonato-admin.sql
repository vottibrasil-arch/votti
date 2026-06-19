-- Painel admin de campeonato personalizado
-- Execute no SQL Editor do Supabase

-- Status Aberto/Fechado das apostas (independente de excluir/desativar)
alter table public.campeonatos
  add column if not exists apostas_abertas boolean not null default true;

-- Bolão vinculado ao campeonato (um link de convite para todo o bolão)
alter table public.boloes
  add column if not exists campeonato_id bigint references public.campeonatos(id) on delete cascade;

create index if not exists idx_boloes_campeonato on public.boloes(campeonato_id);

-- Permite bolão só por campeonato (sem partida obrigatória)
-- partida_id já é nullable no schema base
