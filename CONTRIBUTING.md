# Contributing to Coliseo

Thanks for being here. Coliseo is meant to take on a life of its own, and
that only works if contributing is easy. There are **three ways to help** — pick
the lane that fits. (New to the project? Read the
[About](https://github.com/mancunianinnyc/ConvictionELO/wiki/About) page first.)

## 1. 📊 Improve the data — no code needed

The rankings are only as good as the company data behind them.

- **Add a company** — use the in-app **Submit** page. It's URL-first and auto-fills the name, pitch and logo from the site.
- **Fix a profile** — spot a wrong founding year, funding figure, HQ, or founder? The seed data lives in [`lib/seed.ts`](./lib/seed.ts). Open an issue or a PR. (An in-app, wiki-style suggest-edit flow gated by credibility tier is on the [roadmap](./ROADMAP.md).)
- **Verify** — the seed profiles were hand-compiled from public knowledge and will contain stale figures. Corrections **with a source** are especially welcome.

### Who belongs in the arena (eligibility)
A company is eligible while it's a **private**, **venture-backed** (raised ≥ a Seed
round), **alive & independent** operating company. Submissions are reviewed
against this before going live.

When a company **IPOs, is acquired, or shuts down** it *graduates*: it's archived
out of voting and the live rankings but keeps its profile + final rating in the
Graduates list. The eligible/graduated companies are marked in the `EXITS` map in
[`lib/companies.data.ts`](./lib/companies.data.ts); to graduate one on a live DB
without a re-seed, use `npm run db:retire -- "<Company>" <public|acquired|dead> "<note>"`.

## 2. 💻 Contribute code

### Project shape
- **Next.js 14 (App Router) + TypeScript + React 18**; plain CSS with design tokens in `app/globals.css`.
- **Supabase** (Postgres + auth + Row-Level Security) is the backend; schema and functions live in `supabase/`.
- The full map is in [`CLAUDE.md`](./CLAUDE.md); deeper product detail in [`ConvictionELO-spec.md`](./ConvictionELO-spec.md).

### Local setup
```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key (optional)
npm run dev                  # http://localhost:3000
```
Without Supabase configured, the app falls back to in-memory seed data — so you
can run and hack on the whole UI with **zero backend setup**.

> **Windows note:** keep the repo out of a OneDrive-synced folder. OneDrive
> fights Next.js over the `.next` build directory and will break the dev server.

### House rules (please read)
- **Keep `lib/elo.ts` pure** — no React or Supabase imports. It's the heart of the product and must stay unit-testable. If you change the Elo constants, mirror them in `supabase/cast_vote.sql` (there's a KEEP-IN-SYNC note on both sides).
- **Votes are append-only.** Never delete or mutate a vote row — the log is what enables split analysis and future re-estimation (Bradley–Terry / TrueSkill / Glicko-2).
- **Ratings are applied server-side only** (the `cast_vote` function). Clients report a pick; they never write ratings directly.
- **RLS is not optional** — public reads, role-gated writes.
- **Never commit secrets** — `.env.local` is gitignored; `.env.example` lists the key names only.
- **Design:** light & airy, teal (`#0eb6a6`) + sky (`#37b6ff`) accents, **no purple**. Fraunces for headlines, Space Grotesk for UI.

### Handy scripts
| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally |
| `npm run db:apply-schema` | Apply `supabase/schema.sql` |
| `npm run db:apply-sql -- <file>` | Apply a single migration file |
| `npm run db:seed` | Seed companies + ratings |
| `npm run db:reset-test-data` | Wipe test data and re-seed (pre-launch) |
| `npm run logos:fetch` | Refresh the self-hosted logos |

### Good first issues
Look for the `good first issue` label on GitHub — small, well-scoped, reviewed
quickly. Open an issue before large changes so we can align on approach.

## 3. 🔌 Build on top — ecosystem

A **public read API** and an **embeddable rank badge** are on the
[roadmap](./ROADMAP.md). Want to build a newsletter, a bot, or a vertical spin on
the data? Open an issue and let's talk — third-party builders are exactly how
this takes on a life of its own.

## The one ground rule

The goal is a **trustworthy** ranking. Assume good faith, be constructive — and
anything that games the system (vote brigading, fake or coordinated accounts,
manipulated company data) is out of bounds and will be reverted.

## License

The project is released under **[AGPL-3.0](./LICENSE)** — the same license
Lichess uses — so it stays open as it grows (see the note in the
[roadmap](./ROADMAP.md)). By contributing, you agree your contributions are
licensed under the same terms.
