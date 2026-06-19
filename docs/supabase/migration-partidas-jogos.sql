-- Campeonato personalizado: jogos com fase, escudos e ordem
-- Execute no SQL Editor do Supabase

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS fase text;
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS escudo_casa text;
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS escudo_fora text;
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS ordem integer;

CREATE INDEX IF NOT EXISTS idx_partidas_campeonato_ordem
  ON partidas (campeonato_id, ordem);
