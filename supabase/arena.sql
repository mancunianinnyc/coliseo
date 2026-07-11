-- The Arena500 — a fixed-size, reconstituted index on top of the full DB.
-- `notability` scores every company from the signals we have; `arena_eligible`
-- marks the current top-N (the ones the head-to-head arena + leaderboard surface).
-- Rebuilt by scripts/rebuild-arena.ts after each import ("reconstitution").
--
-- Idempotent — safe to run repeatedly. Applied to prod July 2026.

alter table companies add column if not exists notability integer not null default 0;
alter table companies add column if not exists arena_eligible boolean not null default false;

-- The app loads only arena-eligible companies, so this partial index keeps that
-- filter fast as the underlying DB grows into the tens of thousands.
create index if not exists companies_arena_idx on companies (arena_eligible) where arena_eligible;
