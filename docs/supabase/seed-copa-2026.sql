-- Seed: Copa do Mundo 2026 + partidas de exemplo
-- Execute após schema.sql (só se ainda não houver o campeonato)

insert into public.campeonatos (nome, api_league_id, ativo, tipo, owner_id)
select 'Copa do Mundo 2026', 1, true, 'oficial', null
where not exists (
  select 1 from public.campeonatos where nome = 'Copa do Mundo 2026'
);

-- Garante tipo oficial em registros já existentes
update public.campeonatos
set tipo = 'oficial', owner_id = null
where nome = 'Copa do Mundo 2026';

-- Se o insert acima não retornar id (tabela já populada), busque o id:
-- select id from campeonatos where nome = 'Copa do Mundo 2026';

insert into public.partidas (campeonato_id, time_casa, time_fora, status, data_partida)
select c.id, v.time_casa, v.time_fora, 'agendado', v.data_partida
from public.campeonatos c
cross join (
  values
    ('Brasil', 'França', '2026-07-11 16:00:00+00'::timestamptz),
    ('Argentina', 'Inglaterra', '2026-07-11 20:00:00+00'::timestamptz),
    ('Portugal', 'Espanha', '2026-07-10 13:00:00+00'::timestamptz),
    ('Alemanha', 'Holanda', '2026-07-10 17:00:00+00'::timestamptz),
    ('Croácia', 'Marrocos', '2026-07-06 12:00:00+00'::timestamptz),
    ('Uruguai', 'Japão', '2026-07-06 16:00:00+00'::timestamptz)
) as v(time_casa, time_fora, data_partida)
where c.nome = 'Copa do Mundo 2026'
  and not exists (
    select 1 from public.partidas p
    where p.campeonato_id = c.id
      and p.time_casa = v.time_casa
      and p.time_fora = v.time_fora
  );
