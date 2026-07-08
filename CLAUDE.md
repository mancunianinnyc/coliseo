# CLAUDE.md — ConvictionELO

Project guide for Claude Code / AI agents working in this repo. Read this first, then `ConvictionELO-spec.md` for full product detail.

## What this is

ConvictionELO is a daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating (three independent ratings per company: **Value**, **Growth**, **Workplace**), and daily play builds a streak → credibility tier → vote weight. See `ConvictionELO-spec.md` for the complete spec (mechanics, roadmap, design tokens, Supabase schema) — it is the source of truth. `startup-elo-mvp.html` is the original single-file prototype that this app is ported from.

## Stack

- **Next.js 14 (App Router) + TypeScript + React 18**
- Plain CSS with design tokens in `app/globals.css` (no Tailwind yet — match the existing tokens if you add a framework)
- **Supabase** (Postgres, auth, RLS) is the intended backend — schema in `supabase/schema.sql`, not yet wired to the UI
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
supabase/
  schema.sql        Tables + RLS policies (companies, ratings, votes, profiles, revisions)
```

## How to run

```bash
npm install
npm run dev      # http://localhost:3000
```

The app currently runs fully client-side on seed data (no backend needed). State resets on refresh.

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
