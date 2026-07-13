# CLAUDE.md — Coliseo

Project guide for Claude Code / AI agents working in this repo. Read this first, then `ConvictionELO-spec.md` for full product detail. (The product was renamed from ConvictionELO to **Coliseo** in July 2026; some internal filenames, the GitHub repo, and the Vercel project still carry the old `convictionelo` slug until those external resources are renamed.)

## What this is

Coliseo (formerly ConvictionELO) is a daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating (three independent ratings per company: **Conviction**, **Momentum**, **Talent**), and daily play builds a streak → credibility tier → vote weight. The day = 3 full-weight **arena** picks (king-of-the-hill on one rotating question), then an optional **exhibition** survival run — real append-only votes at ¼ weight, capped at 10/day (`votes.kind`: `arena`|`exhibition`; constants `EXHIBITION_WEIGHT`/`EXHIBITION_CAP` in `app/App.tsx` must stay in sync with `supabase/cast_vote.sql`). Streak/leaderboard-unlock/share-card hang off arena votes only. See `ConvictionELO-spec.md` for the complete spec (mechanics, roadmap, design tokens, Supabase schema) — it is the source of truth.

## Stack

- **Next.js 14 (App Router) + TypeScript + React 18**
- Plain CSS with design tokens in `app/globals.css` (no Tailwind yet — match the existing tokens if you add a framework)
- **Supabase** (Postgres, auth, RLS) is the backend. Companies/ratings load from the DB, anonymous auth mints a pseudonymous identity, `cast_vote` applies Elo server-side, `profiles` persist streak/tier, and `submit_company` creates moderated pending submissions. Schema/RPCs live in `supabase/`.
- Deploy target: **Vercel**. The production project is `convictionelo` (GitHub repo is `mancunianinnyc/coliseo`). Canonical domain: **coliseoelo.com** (Namecheap DNS → Vercel; `www` 308-redirects to apex; `SITE_URL` in `lib/share.ts` + `metadataBase` in `app/layout.tsx` must match). The old `convictionelo.vercel.app` URL still serves so beta links keep working.

## Data & the Arena500 (current state, July 2026)

The DB holds **~4,550 companies** from three sources (the `companies.source` column):
`seed` (~277 hand-curated), `yc` (~4,100 Y Combinator companies via the open yc-oss
dataset), and `unicorn` (~160 from the Wikipedia unicorn list resolved through
Wikidata). But the app only surfaces the **Arena500** — a fixed ~500 top companies by a
notability score (`arena_eligible = true`) — so votes concentrate and the Elo stays
credible no matter how large the DB gets. `loadCompanies` loads **only** the arena.

- **Arena eligibility (guideline, enforced by the importers):** private, alive,
  venture-backed startups founded ≥2005. NOT public/acquired/dead (those *graduate* —
  `lifecycle != 'active'` — and drop out of the arena automatically), and NOT
  people/countries or bootstrapped/family-owned private giants (e.g. Cargill).
  `scripts/import-unicorns.ts` carries an append-only `EXITED` blocklist for known
  exits that Wikidata's stock-exchange/dissolution data misses.
- **Reconstitution:** `npm run db:rebuild-arena [-- N]` re-scores every active company
  and marks the top N (default 500) — run it after any import (S&P-500-style
  promotion/relegation). **Prominence is a STABLE source signal that feeds the score —
  never mutate it inside rebuild** (doing so created a feedback loop that churned the tail).

## Project structure

```
app/
  layout.tsx        Root layout + metadata + <Analytics/>
  page.tsx          Renders <App/>
  App.tsx           The whole interactive client app (vote / tables / profile / submit)
  globals.css       Design tokens + component styles
  api/arena/        Cached Arena500 endpoint (ISR 60s) — clients read this, not
                    PostgREST directly, so traffic spikes hit Vercel's cache not the DB
  api/og/           Dynamic OG share image (edge runtime — REQUIRED, node build of
                    @vercel/og crashes on Windows paths with spaces)
  s/                Share landing page — share links point here; OG meta → /api/og
lib/
  types.ts          Company, Rating, Vote types
  questions.ts      The 3 dimensions (Conviction / Momentum / Talent) + order
  elo.ts            Elo math, credibility tiers, composite score  ← pure, unit-testable
  seed.ts           Builds ~277 hand-curated seed companies (from companies.data.ts)
  companies.data.ts The seed dataset + CATEGORIES/REGIONS/Stage + EXITS (graduated) map
  supabase.ts       Browser Supabase client (null when env not configured)
  loadCompanies.ts  Loads the Arena500 (arena_eligible companies) + ratings from the DB
  auth.ts           useSession(): LAZY anonymous auth — identity minted on first
                    vote/submit via ensureUserId(), never on page load (protects
                    Supabase auth rate limits from traffic spikes)
  track.ts          Vercel Analytics custom-event wrapper + client_error hook
  profile.ts        Load/create profile, persist streak/tier
  castVote.ts       RPC client for server-authoritative voting
  submitCompany.ts  RPC client for moderated submissions
  unknowns.ts       Obscurity signal writes
supabase/
  schema.sql        Base tables + RLS policies
  cast_vote.sql     Server-authoritative vote + Elo RPC (arena + ¼-weight exhibition kinds)
  exhibition.sql    votes.kind column + index (apply BEFORE cast_vote.sql)
  submit_company.sql  Moderated submission RPC
  launch_hardening.sql  Indexes, grants, RLS optimization, rate-limit plumbing
scripts/            (all via npm run db:* ; DB scripts connect through the Supabase pooler)
  apply-schema.ts   Apply schema.sql (db:apply-schema); seed.ts seeds from lib/seed (db:seed)
  import-yc.ts      Bulk-import active YC companies from yc-oss (db:import-yc [-- --dry])
  import-unicorns.ts  Import unicorns via Wikipedia + Wikidata (db:import-unicorns [-- --dry])
  rebuild-arena.ts  Reconstitute the Arena500 (db:rebuild-arena [-- N])
  retire.ts         Graduate a company (db:retire -- "Name" public|acquired|dead "note")
  reset-activity.ts  Non-destructive reset: clear votes/profiles, KEEP companies (db:reset-activity)
  pending.ts        List the pending-submission queue (db:pending)
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
