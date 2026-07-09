-- VOTTI: remover leitura pública de votes e poll_results
-- Execute no SQL Editor do Supabase (produção) após deploy da API de ranking.

-- votes: apenas INSERT para participantes anônimos
drop policy if exists "votes_select_public" on public.votes;

-- Organizadores autenticados ainda podem ver votos das próprias enquetes
-- (policy votes_select_own permanece)

-- poll_results: sem acesso anônimo
revoke select on public.poll_results from anon;

-- Opcional: manter poll_results só para authenticated (painel do organizador)
-- revoke select on public.poll_results from authenticated;

-- Verificação
-- select * from pg_policies where tablename = 'votes';
