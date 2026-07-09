# CLAUDE.md — ConvictionELO

Project guide for Claude Code / AI agents working in this repo. Read this first, then `ConvictionELO-spec.md` for full product detail.

## What this is

ConvictionELO is a daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating (three independent ratings per company: **Value**, **Growth**, **Workplace**), and daily play builds a streak → credibility tier → vote weight. See `ConvictionELO-spec.md` for the complete spec (mechanics, roadmap, design tokens, Supabase schema) — it is the source of truth. `startup-elo-mvp.html` is the original single-file prototype that this app is ported from.

## Stack

- **Next.js 14 (App Router) + TypeScript + React 18**
- Plain CSS with design tokens in `app/globals.css` (no Tailwind yet — match the existing tokens if you add a framework)
- **Supabase** (Postgres, auth, RLS) is the backend — schema in `supabase/schema.sql`. Wired in: companies/ratings load from the DB, anonymous auth mints a pseudonymous identity, votes append to the `votes` log, and streak/tier persist to `profiles`. Server-side Elo application is still a TODO.
- Deploy target: **Vercel** (needed for dynamic Open Graph share images)

## Project structure

```
app/
  layout.tsx        Root layout + metadata
  page.tsx          Renders <App/>
  App.tsx           The whole interactive client app (vote / tables / profile / submit)
  globals.css       Design tokens + component styles
lib/
  types.ts          Company, Rating, Vote types
  questions.ts      The 3 dimensions (Value / Growth / Workplace) + order
  elo.ts            Elo math, credibility tiers, composite score  ← pure, unit-testable
  seed.ts           18 seed startups with divergent per-dimension ratings
  supabase.ts       Browser Supabase client (null when env not configured)
  loadCompanies.ts  Loads companies + ratings from the DB (falls back to seed)
  auth.ts           useSession(): anonymous sign-in + pseudonymous identity
  profile.ts        Load/create profile, persist streak/tier
  votes.ts          Append a head-to-head to the immutable votes log
supabase/
  schema.sql        Tables + RLS policies (companies, ratings, votes, profiles, revisions)
scripts/
  apply-schema.ts   Apply schema.sql to the DB (npm run db:apply-schema)
  seed.ts           Seed companies + ratings from lib/seed.ts (npm run db:seed)
  reset-test-data.ts  Wipe votes/profiles/revisions before launch (npm run db:reset-test-data)
```

**Environment note:** on Windows, keep this repo OUT of a OneDrive-synced folder —
OneDrive fights Next.js over the `.next` build dir and cripples the dev server.

## How to run

```bash
npm install
npm run dev      # http://localhost:3000
```

With Supabase configured via `.env.local`, the app loads companies from the DB and
signs the visitor in anonymously. Without it, the app falls back to in-memory seed data.

**Before any public launch, see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)** — most
importantly, run `npm run db:reset-test-data` to clear test votes/profiles.

## Conventions & guardrails

- **Keep `lib/elo.ts` pure and framework-agnostic** — it's the heart of the product and should stay unit-testable. Don't import React or Supabase into it.
- **Votes are append-only.** When Supabase is wired in, every vote is its own row and is never deleted or mutated (see spec §7) — it's what enables split analysis and future re-estimation (Bradley–Terry / TrueSkill).
- **Apply Elo server-side** eventually: rating writes and revision approvals belong in a `SECURITY DEFINER` function / edge handler, not the client. Clients insert votes; the server validates and updates ratings.
- **RLS is not optional** — public reads, role-gated writes. Follow the policies in `supabase/schema.sql`.
- **Never commit secrets.** Use `.env.local` (gitignored); `.env.example` lists the keys.
- **Design:** light & airy, teal (`#0eb6a6`) + sky (`#37b6ff`) accents, **no purple**. Fraunces for headlines, Space Grotesk for UI.

## Next steps (good first PRs)

1. Wire Supabase: add `@supabase/supabase-js`, a `lib/supabase.ts` client, load companies/ratings from the DB.
2. Auth + persistent streak/credibility on `profiles`.
3. Server route to record a vote and apply Elo atomically.
4. Share card as a route with a dynamic `opengraph-image`.
5. Wiki-style suggest-edit flow against the `revisions` table.
6. Unit tests for `lib/elo.ts`.

## Deferred (do not build yet)

Prediction/betting markets, founder accounts, investor verification, mobile app, paid plans. See spec §10.
