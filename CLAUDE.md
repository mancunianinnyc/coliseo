# CLAUDE.md — Coliseo

Project guide for Claude Code / AI agents working in this repo. Read this first, then `ConvictionELO-spec.md` for full product detail. (The product was renamed from ConvictionELO to **Coliseo** in July 2026; some internal filenames, the GitHub repo, and the Vercel project still carry the old `convictionelo` slug until those external resources are renamed.)

## What this is

Coliseo (formerly ConvictionELO) is a daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating (three independent ratings per company: **Value**, **Growth**, **Workplace**), and daily play builds a streak → credibility tier → vote weight. See `ConvictionELO-spec.md` for the complete spec (mechanics, roadmap, design tokens, Supabase schema) — it is the source of truth.

## Stack

- **Next.js 14 (App Router) + TypeScript + React 18**
- Plain CSS with design tokens in `app/globals.css` (no Tailwind yet — match the existing tokens if you add a framework)
- **Supabase** (Postgres, auth, RLS) is the backend. Companies/ratings load from the DB, anonymous auth mints a pseudonymous identity, `cast_vote` applies Elo server-side, `profiles` persist streak/tier, and `submit_company` creates moderated pending submissions. Schema/RPCs live in `supabase/`.
- Deploy target: **Vercel**. The production project is `convictionelo`.

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
  castVote.ts       RPC client for server-authoritative voting
  submitCompany.ts  RPC client for moderated submissions
  unknowns.ts       Obscurity signal writes
supabase/
  schema.sql        Base tables + RLS policies
  cast_vote.sql     Server-authoritative vote + Elo RPC
  submit_company.sql  Moderated submission RPC
  launch_hardening.sql  Indexes, grants, RLS optimization, rate-limit plumbing
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

**Before any public launch, see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)**.

## Conventions & guardrails

- **Keep `lib/elo.ts` pure and framework-agnostic** — it's the heart of the product and should stay unit-testable. Don't import React or Supabase into it.
- **Votes are append-only.** When Supabase is wired in, every vote is its own row and is never deleted or mutated (see spec §7) — it's what enables split analysis and future re-estimation (Bradley–Terry / TrueSkill).
- **Keep Elo server-side.** Rating writes flow through `cast_vote`; clients should never write `ratings` directly.
- **RLS is not optional** — public reads, role-gated writes. Follow the policies in `supabase/schema.sql`.
- **Never commit secrets.** Use `.env.local` (gitignored); `.env.example` lists the keys.
- **Design:** light & airy, teal (`#0eb6a6`) + sky (`#37b6ff`) accents, **no purple**. Fraunces for headlines, Space Grotesk for UI.

## Next steps (good first PRs)

1. Add unit tests for `lib/elo.ts` and RPC contract tests for `cast_vote`.
2. Move browser-facing vote/submission calls behind Next.js route handlers so the `SECURITY DEFINER` RPCs can be revoked from `authenticated`.
3. Add Playwright smoke coverage for vote, leaderboard unlock, submit, and profile flows.
4. Add observability/error reporting for Vercel and Supabase RPC failures.
5. Ship canonical domain, privacy note, and a small terms page before broad public launch.
6. Build the wiki-style suggest-edit flow against the `revisions` table.

## Deferred (do not build yet)

Prediction/betting markets, founder accounts, investor verification, mobile app, paid plans. See spec §10.
