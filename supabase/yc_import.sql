-- Provenance for bulk-imported companies (e.g. the Y Combinator pipeline).
-- Lets a re-runnable importer/sync target only its own rows and stay idempotent,
-- without ever clobbering hand-seeded or crowd-submitted companies.
--
-- Idempotent — safe to run repeatedly. Applied to prod July 2026.

alter table companies add column if not exists source text not null default 'seed';
alter table companies add column if not exists yc_id bigint;

-- One row per YC company; enables ON CONFLICT upserts for the ongoing sync.
create unique index if not exists companies_yc_id_uidx on companies (yc_id) where yc_id is not null;

-- source ∈ {'seed','submit','yc', ...}; keep it a simple text tag for now.
