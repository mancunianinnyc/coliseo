-- Self-hosted funnel events. Vercel Web Analytics custom events require a Pro
-- team, so lib/track.ts pipes the same events here — we own the DB and the
-- funnel (landed → vote_cast → day_done → share) forever.
--
-- Insert-only for clients: anonymous visitors haven't signed in yet (lazy
-- auth), so the anon role must be able to insert. No select policy — reads go
-- through the pooler (scripts), never the API. Keep rows lean and
-- low-cardinality; this is an aggregate funnel, not a log.
--
-- Apply with: npm run db:apply-sql -- supabase/events.sql

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 40),
  props       jsonb check (pg_column_size(props) <= 2048),
  created_at  timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "insert events" on public.events;
create policy "insert events" on public.events
  for insert to anon, authenticated with check (true);

-- launch_hardening revoked blanket grants from anon; this table needs an
-- explicit insert grant (and sequence usage for the identity column).
grant insert on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;

create index if not exists events_name_created_idx on public.events (name, created_at desc);
