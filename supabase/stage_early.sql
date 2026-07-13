-- Widen the company stage taxonomy from two tiers to three: Early / Growth / Late.
-- The original schema.sql constrained stage to ('Growth','Late'); this allows
-- 'Early' as well, so the arena and the Arena500's stage filter can distinguish
-- early-stage companies. (Historical migration — long since applied; Early-stage
-- rows exist.)
--
-- Apply with:  npm run db:apply-sql -- supabase/stage_early.sql

alter table companies drop constraint if exists companies_stage_check;
alter table companies
  add constraint companies_stage_check check (stage in ('Early', 'Growth', 'Late'));
