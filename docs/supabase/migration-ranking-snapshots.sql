-- Snapshot de ranking (atualizado após cada voto via POST /refresh-snapshot)
-- Execute no SQL Editor do Supabase.

create table if not exists public.ranking_snapshots (
  slug        text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.ranking_snapshots enable row level security;

-- Sem políticas para anon/authenticated: apenas service role acessa via API Vercel.

-- View para montar snapshot com uma única consulta (contagens via poll_results)
create or replace view public.poll_ranking_feed as
select
  p.slug,
  p.id as poll_id,
  p.title,
  p.description,
  p.logo_url,
  p.photo_url,
  p.primary_color,
  p.status,
  q.id as question_id,
  q.text as question_text,
  q.sort_order as question_sort,
  o.id as option_id,
  o.text as option_text,
  o.sort_order as option_sort,
  o.image_url,
  coalesce(pr.vote_count, 0)::bigint as vote_count,
  (
    select count(distinct v.voter_token)::bigint
    from public.votes v
    where v.poll_id = p.id
  ) as participant_count
from public.polls p
join public.questions q on q.poll_id = p.id
join public.options o on o.question_id = q.id
left join public.poll_results pr on pr.poll_id = p.id and pr.option_id = o.id;

grant select on public.ranking_snapshots to anon, authenticated;

drop policy if exists "ranking_snapshots_public_read" on public.ranking_snapshots;
create policy "ranking_snapshots_public_read" on public.ranking_snapshots
  for select to anon, authenticated
  using (true);

revoke all on public.poll_ranking_feed from anon, authenticated;

-- Remove snapshot quando a enquete é excluída
create or replace function public.delete_ranking_snapshot_on_poll_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ranking_snapshots where slug = OLD.slug;
  return OLD;
end;
$$;

drop trigger if exists trg_poll_delete_ranking_snapshot on public.polls;
create trigger trg_poll_delete_ranking_snapshot
  after delete on public.polls
  for each row
  execute function public.delete_ranking_snapshot_on_poll_delete();
