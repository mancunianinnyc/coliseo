-- Exhibition bouts — post-daily play at ¼ vote weight.
--
-- After finishing the day's 3 Arena picks, a player can keep going:
-- "exhibition" votes are real, append-only votes that move Elo at a quarter
-- of the player's normal credibility weight, capped at 10 per local day.
-- The scarce daily ritual (streak, leaderboard unlock, share card) hangs off
-- Arena votes only, so exhibition play never dilutes it.
--
-- This file adds the votes.kind column; the exhibition-aware cast_vote
-- definition lives in supabase/cast_vote.sql. Apply BOTH, in this order:
--
--   npm run db:apply-sql -- supabase/exhibition.sql
--   npm run db:apply-sql -- supabase/cast_vote.sql

alter table votes add column if not exists kind text not null default 'arena';

do $$ begin
  alter table votes add constraint votes_kind_check
    check (kind in ('arena', 'exhibition'));
exception
  when duplicate_object then null; -- already applied
end $$;

-- The daily-limit checks in cast_vote count votes by (voter, day, kind).
create index if not exists votes_voter_kind_created_idx
  on votes (voter_id, kind, created_at);
