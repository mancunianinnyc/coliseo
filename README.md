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

## Try the prototype

Double-click **`startup-elo-mvp.html`** (opens in your default browser). Then:

1. **Vote** — you get 3 daily matchups, one per dimension (Value → Growth → Workplace). Tap a company to cast your call and watch the Elo move.
2. **▶ new day** (top strip) — fast-forwards to tomorrow so you can watch the streak and credibility tier climb (or decay if you skip a day).
3. **Tables** — browse the Overall composite leaderboard plus per-dimension tables, filtered by category / region / stage.
4. **Submit** — add a startup; it enters all three tables at Elo 1500.

## Hand it to another tool

To continue building in Lovable, Replit, or v0: share **`ConvictionELO-spec.md`** (explains the intent) alongside **`startup-elo-mvp.html`** (shows the feel). Section 11 of the spec is a copy-paste bootstrap prompt.

## Decisions locked in

- **Name:** ConvictionELO · **Domain (mock):** convictionelo.com
- **Three dimensions:** Value, Growth, Workplace — each its own Elo; a single equal-weighted **Overall** composite table on top.
- **Daily loop:** 3 picks/day, single-tap, one per dimension.
- **Retention:** streak → credibility tier (Rookie→Legend) → vote weight. Missed day decays one tier (not a full reset).
- **Design:** light & airy, teal/sky accents (no purple), Fraunces + Space Grotesk.
- **Deferred:** betting/prediction markets, founder accounts, mobile app, paid plans.

## Push these files to your GitHub repo

Repo: **https://github.com/mancunianinnyc/ConvictionELO**

From this project folder, on a machine where you're signed in to GitHub:

```bash
git init
git remote add origin https://github.com/mancunianinnyc/ConvictionELO.git
git add .
git commit -m "Add spec, README, prototype and .gitignore"
git branch -M main
git pull origin main --allow-unrelated-histories   # pulls the repo's existing README
# if README.md conflicts, keep this folder's version:
#   git checkout --ours README.md && git add README.md && git commit --no-edit
git push -u origin main
```

Prefer the browser? On the repo page use **Add file → Upload files**, drag in `ConvictionELO-spec.md`, `startup-elo-mvp.html`, `Startup ELO.md`, and `.gitignore`, and commit.

## Run the app locally

A runnable **Next.js + TypeScript** app is scaffolded. It currently runs fully client-side on seed data (no backend needed yet).

```bash
npm install
npm run dev      # http://localhost:3000
```

## Repository contents

```
app/                    Next.js App Router — the runnable app
  App.tsx               the whole interactive client app (vote / tables / profile / submit)
  globals.css           design tokens + component styles
  layout.tsx, page.tsx
lib/                    pure domain logic (framework-agnostic)
  elo.ts                Elo math, credibility tiers, composite  ← unit-testable core
  seed.ts, questions.ts, types.ts
supabase/schema.sql     Postgres tables + RLS policies (for the backend step)
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

Good first tasks for Claude Code are listed at the bottom of `CLAUDE.md` (wire Supabase, auth + persistent streak, server-side Elo, OG share images, suggest-edit flow, unit tests for `lib/elo.ts`).

## Status

Front-end prototype **and** a runnable Next.js foundation complete. Next: back it with Supabase + deploy on Vercel — see spec §9 and `CLAUDE.md`.
