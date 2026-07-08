-- VOTTI — habilitar Realtime na tabela de votos
-- Execute DEPOIS do schema.sql

alter publication supabase_realtime add table public.votes;
