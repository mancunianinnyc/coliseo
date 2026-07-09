-- Crunchbase-style profile fields for companies. Additive + idempotent, so it's
-- safe to run on an existing database.
--
-- Apply with:  npm run db:apply-sql -- supabase/company_profile_fields.sql

alter table companies add column if not exists logo_url      text;
alter table companies add column if not exists description   text;        -- 1–3 sentence overview (longer than blurb)
alter table companies add column if not exists founded_year  int;
alter table companies add column if not exists headquarters  text;        -- "San Francisco, USA"
alter table companies add column if not exists employees     text;        -- range, e.g. "5,001–10,000"
alter table companies add column if not exists total_funding text;        -- e.g. "$17.9B"
alter table companies add column if not exists valuation     text;        -- latest known, e.g. "$157B"
alter table companies add column if not exists founders      text[];      -- founder names
alter table companies add column if not exists tags          text[];      -- topic tags for the profile
alter table companies add column if not exists links         jsonb;       -- { x, linkedin, crunchbase }
