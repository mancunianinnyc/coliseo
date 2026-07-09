-- "I don't know this company" signal — a free, append-only log of which
-- companies a voter flagged as unfamiliar. Not a vote; it never touches Elo.
-- It's an obscurity heatmap (which companies aren't known yet) and a future
-- matchmaking input (avoid pairing people with companies they don't know).
--
-- Apply with:  npm run db:apply-sql -- supabase/company_unknowns.sql

create table if not exists company_unknowns (
  id          uuid primary key default gen_random_uuid(),
  voter_id    uuid not null references auth.users(id),
  company_id  bigint not null references companies(id) on delete cascade,
  dimension   text check (dimension in ('V','G','D')),
  created_at  timestamptz not null default now()
);
create index if not exists company_unknowns_company_idx on company_unknowns(company_id);

alter table company_unknowns enable row level security;

-- Signed-in (incl. anonymous) users may record their own flags. No public read
-- of raw rows; aggregates can be exposed later via a view/function.
drop policy if exists "insert own unknowns" on company_unknowns;
create policy "insert own unknowns" on company_unknowns
  for insert to authenticated with check (auth.uid() = voter_id);
