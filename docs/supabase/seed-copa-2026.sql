-- Seed completo: Copa do Mundo 2026 (fase de grupos A-L)
-- Estruturas usadas: somente public.campeonatos e public.partidas
-- Requisitos esperados: colunas fase/ordem já existentes em partidas
-- (conforme docs/supabase/migration-partidas-jogos.sql)

insert into public.campeonatos (nome, api_league_id, ativo, tipo, owner_id)
select 'Copa do Mundo 2026', 1, true, 'oficial', null
where not exists (
  select 1 from public.campeonatos where nome = 'Copa do Mundo 2026'
);

update public.campeonatos
set tipo = 'oficial', owner_id = null, ativo = true
where nome = 'Copa do Mundo 2026';

with camp as (
  select id
  from public.campeonatos
  where nome = 'Copa do Mundo 2026'
  limit 1
),
fixtures(fase, ordem, time_casa, time_fora, data_partida) as (
  values
    -- Grupo A
    ('Grupo A', 1, 'México', 'África do Sul', '2026-06-12T16:00:00-03:00'::timestamptz),
    ('Grupo A', 2, 'Coreia do Sul', 'República Tcheca', '2026-06-13T17:00:00-03:00'::timestamptz),
    ('Grupo A', 3, 'África do Sul', 'Coreia do Sul', '2026-06-15T18:00:00-03:00'::timestamptz),
    ('Grupo A', 4, 'México', 'Coreia do Sul', '2026-06-18T20:00:00-03:00'::timestamptz),
    ('Grupo A', 5, 'República Tcheca', 'México', '2026-06-22T21:00:00-03:00'::timestamptz),
    ('Grupo A', 6, 'África do Sul', 'República Tcheca', '2026-06-24T16:00:00-03:00'::timestamptz),

    -- Grupo B
    ('Grupo B', 7, 'Canadá', 'Bósnia', '2026-06-12T16:00:00-03:00'::timestamptz),
    ('Grupo B', 8, 'Qatar', 'Suíça', '2026-06-13T17:00:00-03:00'::timestamptz),
    ('Grupo B', 9, 'Suíça', 'Bósnia', '2026-06-18T18:00:00-03:00'::timestamptz),
    ('Grupo B', 10, 'Canadá', 'Qatar', '2026-06-18T20:00:00-03:00'::timestamptz),
    ('Grupo B', 11, 'Suíça', 'Canadá', '2026-06-24T18:00:00-03:00'::timestamptz),
    ('Grupo B', 12, 'Bósnia', 'Qatar', '2026-06-24T16:00:00-03:00'::timestamptz),

    -- Grupo C
    ('Grupo C', 13, 'Brasil', 'Marrocos', '2026-06-13T15:00:00-03:00'::timestamptz),
    ('Grupo C', 14, 'Haiti', 'Escócia', '2026-06-13T20:00:00-03:00'::timestamptz),
    ('Grupo C', 15, 'Escócia', 'Marrocos', '2026-06-19T19:00:00-03:00'::timestamptz),
    ('Grupo C', 16, 'Brasil', 'Haiti', '2026-06-19T20:00:00-03:00'::timestamptz),
    ('Grupo C', 17, 'Escócia', 'Brasil', '2026-06-24T16:00:00-03:00'::timestamptz),
    ('Grupo C', 18, 'Marrocos', 'Haiti', '2026-06-24T19:00:00-03:00'::timestamptz),

    -- Grupo D
    ('Grupo D', 19, 'EUA', 'Paraguai', '2026-06-12T22:00:00-03:00'::timestamptz),
    ('Grupo D', 20, 'Austrália', 'Turquia', '2026-06-14T16:00:00-03:00'::timestamptz),
    ('Grupo D', 21, 'Turquia', 'Paraguai', '2026-06-20T20:00:00-03:00'::timestamptz),
    ('Grupo D', 22, 'EUA', 'Austrália', '2026-06-20T23:00:00-03:00'::timestamptz),
    ('Grupo D', 23, 'Turquia', 'EUA', '2026-06-26T16:00:00-03:00'::timestamptz),
    ('Grupo D', 24, 'Paraguai', 'Austrália', '2026-06-26T20:00:00-03:00'::timestamptz),

    -- Grupo E
    ('Grupo E', 25, 'Alemanha', 'Curaçao', '2026-06-14T21:00:00-03:00'::timestamptz),
    ('Grupo E', 26, 'Costa do Marfim', 'Equador', '2026-06-19T22:00:00-03:00'::timestamptz),
    ('Grupo E', 27, 'Alemanha', 'Costa do Marfim', '2026-06-20T22:00:00-03:00'::timestamptz),
    ('Grupo E', 28, 'Equador', 'Curaçao', '2026-06-22T23:00:00-03:00'::timestamptz),
    ('Grupo E', 29, 'Equador', 'Alemanha', '2026-06-25T15:00:00-03:00'::timestamptz),
    ('Grupo E', 30, 'Curaçao', 'Costa do Marfim', '2026-06-25T21:00:00-03:00'::timestamptz),

    -- Grupo F
    ('Grupo F', 31, 'Holanda', 'Japão', '2026-06-14T21:00:00-03:00'::timestamptz),
    ('Grupo F', 32, 'Suécia', 'Tunísia', '2026-06-14T23:00:00-03:00'::timestamptz),
    ('Grupo F', 33, 'Tunísia', 'Japão', '2026-06-20T20:00:00-03:00'::timestamptz),
    ('Grupo F', 34, 'Holanda', 'Suécia', '2026-06-20T21:00:00-03:00'::timestamptz),
    ('Grupo F', 35, 'Tunísia', 'Holanda', '2026-06-26T17:00:00-03:00'::timestamptz),
    ('Grupo F', 36, 'Japão', 'Suécia', '2026-06-26T20:00:00-03:00'::timestamptz),

    -- Grupo G
    ('Grupo G', 37, 'Bélgica', 'Egito', '2026-06-15T15:00:00-03:00'::timestamptz),
    ('Grupo G', 38, 'Irã', 'Nova Zelândia', '2026-06-15T16:00:00-03:00'::timestamptz),
    ('Grupo G', 39, 'Bélgica', 'Irã', '2026-06-21T15:00:00-03:00'::timestamptz),
    ('Grupo G', 40, 'Nova Zelândia', 'Egito', '2026-06-21T21:00:00-03:00'::timestamptz),
    ('Grupo G', 41, 'Nova Zelândia', 'Bélgica', '2026-06-27T21:00:00-03:00'::timestamptz),
    ('Grupo G', 42, 'Egito', 'Irã', '2026-06-27T23:00:00-03:00'::timestamptz),

    -- Grupo H
    ('Grupo H', 43, 'Espanha', 'Cabo Verde', '2026-06-15T15:00:00-03:00'::timestamptz),
    ('Grupo H', 44, 'Arábia Saudita', 'Uruguai', '2026-06-16T16:00:00-03:00'::timestamptz),
    ('Grupo H', 45, 'Espanha', 'Uruguai', '2026-06-19T17:00:00-03:00'::timestamptz),
    ('Grupo H', 46, 'Espanha', 'Arábia Saudita', '2026-06-21T15:00:00-03:00'::timestamptz),
    ('Grupo H', 47, 'Uruguai', 'Cabo Verde', '2026-06-21T21:00:00-03:00'::timestamptz),
    ('Grupo H', 48, 'Cabo Verde', 'Arábia Saudita', '2026-06-26T21:00:00-03:00'::timestamptz),

    -- Grupo I
    ('Grupo I', 49, 'França', 'Senegal', '2026-06-15T15:00:00-03:00'::timestamptz),
    ('Grupo I', 50, 'Iraque', 'Noruega', '2026-06-15T16:00:00-03:00'::timestamptz),
    ('Grupo I', 51, 'França', 'Iraque', '2026-06-22T16:00:00-03:00'::timestamptz),
    ('Grupo I', 52, 'Noruega', 'Senegal', '2026-06-22T22:00:00-03:00'::timestamptz),
    ('Grupo I', 53, 'Noruega', 'França', '2026-06-27T17:00:00-03:00'::timestamptz),
    ('Grupo I', 54, 'Senegal', 'Iraque', '2026-06-27T20:00:00-03:00'::timestamptz),

    -- Grupo J
    ('Grupo J', 55, 'Argentina', 'Argélia', '2026-06-16T15:00:00-03:00'::timestamptz),
    ('Grupo J', 56, 'Áustria', 'Jordânia', '2026-06-17T17:00:00-03:00'::timestamptz),
    ('Grupo J', 57, 'Argentina', 'Áustria', '2026-06-23T20:00:00-03:00'::timestamptz),
    ('Grupo J', 58, 'Jordânia', 'Argélia', '2026-06-23T23:00:00-03:00'::timestamptz),
    ('Grupo J', 59, 'Jordânia', 'Argentina', '2026-06-27T17:00:00-03:00'::timestamptz),
    ('Grupo J', 60, 'Argélia', 'Áustria', '2026-06-27T23:00:00-03:00'::timestamptz),

    -- Grupo K
    ('Grupo K', 61, 'Portugal', 'RD Congo', '2026-06-16T14:00:00-03:00'::timestamptz),
    ('Grupo K', 62, 'Uzbequistão', 'Colômbia', '2026-06-17T16:00:00-03:00'::timestamptz),
    ('Grupo K', 63, 'Portugal', 'Uzbequistão', '2026-06-23T17:00:00-03:00'::timestamptz),
    ('Grupo K', 64, 'Colômbia', 'RD Congo', '2026-06-23T20:00:00-03:00'::timestamptz),
    ('Grupo K', 65, 'Colômbia', 'Portugal', '2026-06-27T21:00:00-03:00'::timestamptz),
    ('Grupo K', 66, 'RD Congo', 'Uzbequistão', '2026-06-27T23:00:00-03:00'::timestamptz),

    -- Grupo L
    ('Grupo L', 67, 'Inglaterra', 'Croácia', '2026-06-16T17:00:00-03:00'::timestamptz),
    ('Grupo L', 68, 'Gana', 'Panamá', '2026-06-17T22:00:00-03:00'::timestamptz),
    ('Grupo L', 69, 'Inglaterra', 'Gana', '2026-06-23T17:00:00-03:00'::timestamptz),
    ('Grupo L', 70, 'Panamá', 'Croácia', '2026-06-23T21:00:00-03:00'::timestamptz),
    ('Grupo L', 71, 'Panamá', 'Inglaterra', '2026-06-27T17:00:00-03:00'::timestamptz),
    ('Grupo L', 72, 'Croácia', 'Gana', '2026-06-27T20:00:00-03:00'::timestamptz)
)
insert into public.partidas (
  campeonato_id,
  fase,
  ordem,
  time_casa,
  time_fora,
  status,
  data_partida
)
select
  camp.id,
  fixtures.fase,
  fixtures.ordem,
  fixtures.time_casa,
  fixtures.time_fora,
  'agendado',
  fixtures.data_partida
from camp
join fixtures on true
where not exists (
  select 1
  from public.partidas p
  where p.campeonato_id = camp.id
    and p.fase = fixtures.fase
    and p.time_casa = fixtures.time_casa
    and p.time_fora = fixtures.time_fora
    and p.data_partida = fixtures.data_partida
);
