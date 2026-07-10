-- Company prominence (1–5): how much of a household name a company is. This is
-- the fame signal behind peer matchmaking + the new-user warm-up ramp, so voters
-- mostly see companies at their own recognition level instead of pointless
-- famous-vs-obscure matchups (which just train brand-recognition voting).
--
-- Backfilled from the seed's `p` (lib/companies.data.ts; see baseElo in
-- lib/seed.ts) — run `npm run db:backfill-prominence` after applying this.
-- Submissions default to 2.
--
-- Apply with:  npm run db:apply-sql -- supabase/prominence.sql

alter table companies
  add column if not exists prominence smallint not null default 2;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_prominence_range'
  ) then
    alter table companies
      add constraint companies_prominence_range check (prominence between 1 and 5);
  end if;
end $$;
