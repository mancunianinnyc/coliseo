# ConvictionELO

A daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating, every rating change is a shareable object, and showing up daily builds your credibility. **Wordle's daily ritual × Fantasy Premier League's league tables × a startup-ranking wiki.**

*(Working title "Startup ELO" — now branded **ConvictionELO**.)*

---

## Start here

| File | What it is |
|------|------------|
| **[ConvictionELO-spec.md](./ConvictionELO-spec.md)** | The single source of truth. Full product spec, mechanics, Elo math, data model, design tokens, recommended stack, roadmap, and a ready-to-paste bootstrap prompt for Lovable / Replit / v0. **Read this first.** |
| **[startup-elo-mvp.html](./startup-elo-mvp.html)** | The working interactive prototype. Just double-click to open in any browser — no install, no backend. State resets on refresh. |
| **[Startup ELO.md](./Startup%20ELO.md)** | The original strategy blueprint — the deeper rationale and citations behind every product decision. |

## Run the app

A runnable **Next.js + TypeScript** app is live-backed by Supabase. It loads
companies and ratings from Postgres, signs visitors in with Supabase Anonymous
Auth, applies votes through the server-authoritative `cast_vote` RPC, persists
streaks in `profiles`, and accepts moderated submissions through
`submit_company`.

```bash
npm install
npm run dev      # http://localhost:3000
```

Without `.env.local`, the app falls back to local seed data so the UI still runs.
Use `.env.example` for the required Supabase keys.

The original single-file prototype is still kept as `startup-elo-mvp.html` for
product/design reference.

## Hand it to another tool

To continue building in Lovable, Replit, or v0: share **`ConvictionELO-spec.md`** (explains the intent) alongside **`startup-elo-mvp.html`** (shows the feel). Section 11 of the spec is a copy-paste bootstrap prompt.

## Decisions locked in

- **Name:** ConvictionELO · **Domain (mock):** convictionelo.com
- **Three dimensions:** Value, Growth, Workplace — each its own Elo; a single equal-weighted **Overall** composite table on top.
- **Daily loop:** 3 picks/day, single-tap, one per dimension.
- **Retention:** streak → credibility tier (Rookie→Legend) → vote weight. Missed day decays one tier (not a full reset).
- **Design:** light & airy, teal/sky accents (no purple), Fraunces + Space Grotesk.
- **Deferred:** betting/prediction markets, founder accounts, mobile app, paid plans.

## Production status

- **GitHub:** `mancunianinnyc/ConvictionELO`
- **Vercel:** `convictionelo` Next.js project
- **Supabase:** `ConvictionELO` in `ca-central-1`
- **Launch hardening:** see `supabase/launch_hardening.sql` and
  `LAUNCH_CHECKLIST.md`

## Repository contents

```
app/                    Next.js App Router — the runnable app
  App.tsx               the whole interactive client app (vote / tables / profile / submit)
  globals.css           design tokens + component styles
  layout.tsx, page.tsx
lib/                    pure domain logic (framework-agnostic)
  elo.ts                Elo math, credibility tiers, composite  ← unit-testable core
  supabase.ts           browser Supabase client
  loadCompanies.ts      DB-backed companies/ratings loader
  auth.ts               anonymous Supabase identity
  castVote.ts           RPC client for server-authoritative voting
  submitCompany.ts      RPC client for moderated submissions
  unknowns.ts           obscurity signal writes
  seed.ts, questions.ts, types.ts
supabase/               Postgres schema, RPCs, and launch hardening SQL
CLAUDE.md               guide for Claude Code / AI agents working in the repo
ConvictionELO-spec.md   product spec + build handoff (source of truth)
startup-elo-mvp.html    original single-file prototype (reference)
Startup ELO.md          original strategy blueprint
.env.example            env keys for the Supabase step
```

## Work on it with Claude Code

Claude Code *can* write to and push to this repo (Cowork can't — that's why the files are staged here for you to push first). Once the initial files are in `mancunianinnyc/ConvictionELO`:

1. Open **Claude Code** and connect it to the `mancunianinnyc/ConvictionELO` repository (the GitHub Integration you already authorized powers this).
2. It reads **`CLAUDE.md`** automatically for project context, stack, and conventions.
3. Ask it to work on a task — it creates a branch, makes changes in an isolated environment, and opens a pull request you review and merge.

Good first tasks for Claude Code are listed at the bottom of `CLAUDE.md`.

## Status

Live MVP foundation complete: Supabase-backed data, anonymous auth, server-side
Elo, moderated submissions, and Vercel deployment. Next: public-launch hardening,
observability, canonical domain, and contributor-friendly tests.
