# Coliseo — Public Roadmap

Coliseo is a daily game where people vote on head-to-head startup matchups,
and every vote nudges a live Elo rating across three dimensions — **Conviction**,
**Momentum**, and **Talent**. This roadmap is public on purpose: the goal is for
the product to take on a life of its own, and that starts with everyone being
able to see where it's going — and shape it.

**Want to influence it?** Open or 👍 an issue on GitHub. Items with the most
community interest move up. See [CONTRIBUTING.md](./CONTRIBUTING.md), and
[the wiki](https://github.com/mancunianinnyc/coliseo/wiki/About) for the
*why*.

**Where we are right now:** the near-term focus is a lean **MVP** — get a
credible, correct version live to a small group, learn from real play, and only
then layer on the viral growth loop. So the socially-viral pieces (share cards,
embeddable badges) are deliberately parked in **Later**: on the roadmap, but not
gating the first release.

> Legend: ✅ shipped · 🔜 next (the MVP) · ⏳ later (growth & scale) · 💭 exploring

---

## ✅ Shipped
- **Daily vote loop** — 3 picks a day, one per dimension (Conviction / Momentum / Talent); tap to choose, provisional select-then-confirm so you can change your mind.
- **Leaderboards** — Overall + per-dimension tables, filterable by category / region / stage.
- **Pseudonymous accounts** — anonymous auth (no PII); daily streak → credibility tier → vote weight.
- **Server-authoritative scoring** — the `cast_vote` Postgres function (`supabase/cast_vote.sql`) validates each vote, applies the Elo atomically, and enforces the 3-picks-per-day limit. Ratings cannot be forged client-side.
- **Rich company profiles + in-vote discovery** — Crunchbase-style dossiers (description, founded, HQ, team size, funding, valuation, founders, tags, links) with self-hosted logos, plus a "learn more" peek that opens the dossier from a matchup *without* spending your pick.
- **Submit a company** — a server-authoritative `submit_company` function (`supabase/submit_company.sql`) lets anyone add a startup; it lands as **pending** and enters the arena only after review. URL auto-fill pre-populates name / pitch / logo from the site.
- **A deep, curated database + the Arena500** — a **~4,550-company** DB (hand-curated seed + Y Combinator + global unicorns) surfaced through the **Arena500**: a fixed ~500 top companies by a notability score that the head-to-head game and leaderboard rank, with S&P-500-style reconstitution as companies rise/fade. Keeps votes concentrated so the Elo stays credible as the DB grows.
- **"I don't know this company"** — a per-company obscurity signal, separate from a toss-up skip.
- **Eligibility & lifecycle** — only private, venture-backed, alive companies compete; those that IPO / get acquired / shut down *graduate* into an archived hall of fame (excluded from the rankings, profile preserved).
- **Live in production** — deployed and playable, with a preview/staging environment for iterating safely before each release.
- **First-run onboarding** — a one-time, dismissible pop-up on a visitor's first load that explains the whole loop in a few seconds (pick a winner; 3 picks a day, one each for Conviction / Momentum / Talent; every vote moves a live rating; finish the day to unlock the leaderboard).
- **In-card advance (mobile-native confirm)** — selecting a company grows a green "Advance to Round N →" button inside the chosen card itself, replacing the standalone "Lock it in" button beta testers missed; the unused "not familiar" corner tag became a plain-language "Don't know them? Swap them out" link.
- **Exhibition bouts (post-daily survival run)** — after the daily 3, the day's champion keeps defending against fresh, deeper-cut challengers until dethroned, retired, or the 10-bout daily cap. Real append-only votes at **¼ vote weight**, so the scarce daily ritual (streak, leaderboard unlock, share card) stays tied to the arena picks; each run ends in a shareable story ("X outlasted N challengers").
- **Launch-scale hardening + instrumentation** — (a) **lazy anonymous auth**: the pseudonymous identity is minted on a visitor's *first vote*, not on page load, so a traffic spike of drive-by visitors can't exhaust Supabase's anonymous sign-in rate limits or mint junk users; (b) **cached arena endpoint** (`/api/arena`, ISR 60s): visitors read the Arena500 from Vercel's cache instead of hitting PostgREST per pageview — the DB sees ~1 read/minute regardless of traffic; (c) **Vercel Analytics + funnel events** (`onboard_dismissed → vote_cast → day_done → exhibition_start → run_over → share`, plus `client_error` reporting), so launch behaviour is measured, not guessed.

## 🔜 Next — a credible MVP (what a small group needs)
- **Data-quality pass** — verify the hand-seeded companies (founders, funding, HQ, logos, dead links) so the rankings start from trustworthy facts.
- **Submission moderation** — a simple approve/reject path for pending submissions (dashboard-driven for now, plus a daily queue check; an in-app admin role comes later, when volume needs it).
- **Wiki-style suggest-edit flow** — community edits to company profiles via the `revisions` table, gated by credibility tier, with full history and reversibility.

## ⏳ Later — growth, virality & scale (on the roadmap, not the MVP)
- **Share cards + dynamic Open Graph images** — a branded, spoiler-friendly "I called X over Y" card per result, each with a canonical public URL. The primary growth loop — turned on once the core is validated with real players.
- **Public, crawlable pages** — per-company profile routes (`/c/[slug]`) and a public leaderboard for SEO and shareable links; also the surface the share cards and badge point at.
- **Embeddable "Ranked on Coliseo" badge** — companies embed their rank on their own sites (à la G2 / Product Hunt), turning the subjects of the ranking into its distributors.
- **A "Discover" home for curiosity (desktop-first)** — today the app is built around the *game* (Vote) and the *rankings* (Tables); once you've spent your 3 daily picks you're effectively done for the day. But discovery is the actual value, so give it its own surface: a **Discover** tab where anyone — especially someone who's *already voted today* — can keep exploring startups in an engaging way, leaning into the desktop's extra screen real estate (the sidebar "Discover" panel is the seed of this). Deliberately pinned for now — captured so it's not lost; not gating the MVP.
  - ~~Keep-playing "exhibition" mode~~ — ✅ **shipped** (v0.8.0) in evolved form: the exhibition survival run (¼-weight real votes, deeper-cut challengers, 10/day cap) — see Shipped. What remains from the original idea: pairing tuned to *maximise* discovery (cross-category surprises) rather than the current champion-peer matchmaking.
  - **Curated collections / themes** — browsable sets ("LatAm rising," "hidden gems," "the AI-coding wars," YC cohorts, "founded 2024") as editorial entry points into the database.
  - **An "Underrated" leaderboard (discovery lift)** — rank companies by how much the crowd backs them *after* actually learning about them, vs. their name recognition. A ranking only a discovery product can produce; feeds off the "I don't know this" signal + a "backed-after-learning" capture (the deferred discovery-lift data model).
  - **Watchlist / "add to radar"** — bookmark companies you discover into a personal list — a reason to return, and the seed for future notifications.
  - **Desktop-first layout** — a multi-column browse experience (collections + a live discovery feed + a daily company spotlight) a phone can't show; mobile gets the leaner exhibition-feed version.
- **Arena500 — deepen it (core index is ✅ shipped)** — the fixed ~500-by-notability index with reconstitution is live (see Shipped). What's left: (a) a smarter notability score once we have funding-round data, (b) confidence-aware gating so provisional companies don't show until they've had enough votes, and (c) making the promotions/relegations recurring shareable content ("this week in the Arena500"). The full open DB (thousands, all stages) lives underneath and is surfaced through Discover; the Arena500 is the curated ranking on top.
- **Confidence-aware ratings (Glicko-2 / rating deviation)** — graduate from raw Elo so new and inactive companies are handled well and noise is damped at scale (the move chess.com and Lichess both made).
- **Anti-manipulation hardening** — cohort/split analysis over the append-only votes log to detect and discount brigading; per-IP rate limits and stronger uniqueness guarantees. (Needed before any high-traffic public push.)
- **Weekly "movers" + season resets** — recurring, shareable content.
- **"Conviction strength" second tap** — slight edge vs. strong call → a bigger Elo swing.
- **Vote-split insights** — "operators vs. investors disagreed on this one."
- **Leagues / friends / invites** — social network effects.
- **Community moderation tooling** — higher trust tiers unlock edit approval and abuse flagging, so moderation scales without a central team (the Lichess model).
- **Bulk company upload (CSV / spreadsheet)** — seed many startups at once by dropping in a CSV/Excel export instead of filling the one-at-a-time form N times. The UX that makes this actually work:
  - A **downloadable template** with the exact column headers, an example row, and the allowed Category / Region / Stage values — most bulk-import pain is schema guesswork, so hand people the schema up front.
  - **Drag-and-drop** a `.csv`/`.xlsx`, parsed in the browser. Required columns: name, website, category, region; optional: blurb, logo, stage, founded, HQ, funding.
  - A **validate-and-preview step before anything is submitted** — a row-by-row table flagging valid rows, warnings (unrecognised category/region), and errors (missing fields, invalid values, or a name already in the arena or pending). Fix in-file and re-drop, or drop the bad rows. Never a blind import.
  - **Confirm → submit** through a batch `submit_companies_bulk` RPC (a set-based sibling of `submit_company`) that inserts every valid row as **pending** and returns a per-row result (new id / skipped reason); the batch then flows through the same moderation queue as single submissions, and logos backfill via the existing fetch fallback.
  - **Guardrails so it can't flood moderation** — gate it behind a trusted/admin tier at first (it starts as a self-serve version of today's internal seed pipeline), with a batch-size cap and rate limit; open it to the public only once community moderation (above) can absorb the volume.
- **Localization / multi-language** — detect the visitor's likely language from their IP/region and serve the UI in it, with an always-visible toggle to switch (and a remembered preference). Especially high-leverage given the LatAm focus — Spanish and Portuguese first. Scope is UI copy (questions, tiers, onboarding, methodology); company data and ratings stay language-neutral.

## 💭 Exploring
- **Sustainability / business model** — keep the daily game and the code free and open, and monetize the *data layer*: paid access to analytics, historical ranking movements, and a database/API of the ecosystem (open-core, à la PostHog / Supabase — see the note below). The trusted, durable, comparable rankings are the asset.
- **Public read API** — let third parties build on the data (newsletters, bots, "Coliseo for [vertical]"); the free tier of the data layer above.
- **New verticals** — the same "Elo over time for dispersed actors who compete only indirectly" applied to **VCs**, funds, agencies, or other industries. See [About](https://github.com/mancunianinnyc/coliseo/wiki/About).
- **Latin America focus** — a credible, open database of the LatAm startup ecosystem, which barely exists today.
- **Prediction-market layer** — the betting adjacency is real, but the regulatory surface is heavy; strictly a phase-3+ consideration, and only once the ranking itself is trusted.

## Explicitly *not* doing yet
Founder accounts, investor verification, deep private-company metrics, a native mobile app, or paid plans. And prediction/betting markets stay parked until the ranking is trusted.

---

### A note on openness
The project is released under **[AGPL-3.0](./LICENSE)** — the license Lichess
uses — so it stays open as it grows, while the code and the rating math remain
fully auditable ("check our math" is a feature for a trust product). The hosted
service, live vote data, and brand are what make it sustainable. This is the
standard open-core split behind projects like PostHog and Supabase.
