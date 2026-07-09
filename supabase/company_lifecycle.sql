-- Company lifecycle. A company is only eligible for the arena while it's a live,
-- independent, venture-backed private company. When it IPOs, gets acquired, or
-- shuts down it "graduates": archived out of voting + live rankings, but its
-- profile and final rating are kept as a historical record.
--
--   active   — in the arena (default)
--   public   — went public (IPO / direct listing)
--   acquired — bought / merged away
--   dead     — shut down
--
-- Eligible for voting & ranking = status = 'live' AND lifecycle = 'active'.
-- (Archived companies stay status='live' so their profile remains publicly
-- readable under the existing RLS policy.)
--
-- Apply with:  npm run db:apply-sql -- supabase/company_lifecycle.sql

alter table companies add column if not exists lifecycle text not null default 'active'
  check (lifecycle in ('active', 'public', 'acquired', 'dead'));
alter table companies add column if not exists exited_at date;
alter table companies add column if not exists exit_note text;

create index if not exists companies_lifecycle_idx on companies(lifecycle);
