-- ConvictionELO — Supabase schema (starting point)
-- Public reads are open; all writes are role-gated via RLS policies.
-- Run in the Supabase SQL editor, or manage via `supabase migration`.

-- ---------- Companies ----------
create table if not exists companies (
  id            bigint generated always as identity primary key,
  name          text not null,
  website       text not null,
  category      text not null,
  region        text not null,
  stage         text not null check (stage in ('Growth','Late')),
  blurb         text,
  gradient      text,
  status        text not null default 'live' check (status in ('pending','live','rejected')),
  created_at    timestamptz not null default now()
);

-- One row per company x dimension. Denormalised current Elo for fast tables.
create table if not exists ratings (
  company_id    bigint not null references companies(id) on delete cascade,
  dimension     text not null check (dimension in ('V','G','D')),
  elo           integer not null default 1500,
  games         integer not null default 0,
  week_movement integer not null default 0,
  season_start  integer not null default 1500,
  primary key (company_id, dimension)
);

-- ---------- Votes (append-only comparison log — NEVER delete) ----------
create table if not exists votes (
  id            uuid primary key default gen_random_uuid(),
  voter_id      uuid not null references auth.users(id),
  company_a     bigint not null references companies(id),
  company_b     bigint not null references companies(id),
  dimension     text not null check (dimension in ('V','G','D')),
  winner        bigint not null references companies(id),
  voter_tier    text,
  created_at    timestamptz not null default now()
);
create index if not exists votes_dim_idx on votes(dimension, created_at);

-- ---------- Profiles (streak / credibility) ----------
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  handle            text unique,
  streak            integer not null default 0,
  tier              text not null default 'Rookie',
  last_active_date  date,
  created_at        timestamptz not null default now()
);

-- ---------- Revisions (wiki-style suggested edits) ----------
create table if not exists revisions (
  id            uuid primary key default gen_random_uuid(),
  company_id    bigint not null references companies(id) on delete cascade,
  author_id     uuid not null references auth.users(id),
  reviewer_id   uuid references auth.users(id),
  diff          jsonb not null,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table companies enable row level security;
alter table ratings   enable row level security;
alter table votes     enable row level security;
alter table profiles  enable row level security;
alter table revisions enable row level security;

-- Public read of live data
create policy "public read companies" on companies for select using (status = 'live');
create policy "public read ratings"   on ratings   for select using (true);

-- Authenticated users can cast votes (as themselves) and suggest edits
create policy "insert own votes" on votes
  for insert to authenticated with check (auth.uid() = voter_id);
create policy "read own votes" on votes
  for select to authenticated using (auth.uid() = voter_id);

create policy "insert own revisions" on revisions
  for insert to authenticated with check (auth.uid() = author_id);

-- Users manage their own profile
create policy "read profiles" on profiles for select using (true);
create policy "upsert own profile" on profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- NOTE: rating updates and revision approvals should run in a SECURITY DEFINER
-- function / edge function that validates the vote and applies the Elo math
-- server-side, so clients never write ratings directly.
