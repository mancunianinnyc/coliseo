-- Widen the company stage taxonomy from two tiers to three: Early / Growth / Late.
-- The original schema.sql constrained stage to ('Growth','Late'); this allows
-- 'Early' as well, so the arena and the Tables' stage filter can distinguish
-- early-stage companies. (No existing rows use 'Early' yet — backfill during the
-- data-quality pass; see LAUNCH_CHECKLIST.md.)
--
-- Apply with:  npm run db:apply-sql -- supabase/stage_early.sql

alter table companies drop constraint if exists companies_stage_check;
alter table companies
  add constraint companies_stage_check check (stage in ('Early', 'Growth', 'Late'));
