# ConvictionELO — Public Roadmap

ConvictionELO is a daily game where people vote on head-to-head startup matchups,
and every vote nudges a live Elo rating across three dimensions — **Value**,
**Growth**, and **Workplace**. This roadmap is public on purpose: the goal is for
the product to take on a life of its own, and that starts with everyone being
able to see where it's going — and shape it.

**Want to influence it?** Open or 👍 an issue on GitHub. Items with the most
community interest move up. See [CONTRIBUTING.md](./CONTRIBUTING.md), and
[the wiki](https://github.com/mancunianinnyc/ConvictionELO/wiki/About) for the
*why*.

**Where we are right now:** the near-term focus is a lean **MVP** — get a
credible, correct version live to a small group, learn from real play, and only
then layer on the viral growth loop. So the socially-viral pieces (share cards,
embeddable badges) are deliberately parked in **Later**: on the roadmap, but not
gating the first release.

> Legend: ✅ shipped · 🔜 next (the MVP) · ⏳ later (growth & scale) · 💭 exploring

---

## ✅ Shipped
- **Daily vote loop** — 3 picks a day, one per dimension (Value / Growth / Workplace); tap to choose, provisional select-then-confirm so you can change your mind.
- **Leaderboards** — Overall + per-dimension tables, filterable by category / region / stage.
- **Pseudonymous accounts** — anonymous auth (no PII); daily streak → credibility tier → vote weight.
- **Server-authoritative scoring** — the `cast_vote` Postgres function (`supabase/cast_vote.sql`) validates each vote, applies the Elo atomically, and enforces the 3-picks-per-day limit. Ratings cannot be forged client-side.
- **Rich company profiles + in-vote discovery** — Crunchbase-style dossiers (description, founded, HQ, team size, funding, valuation, founders, tags, links) with self-hosted logos, plus a "learn more" peek that opens the dossier from a matchup *without* spending your pick.
- **Submit a company** — a server-authoritative `submit_company` function (`supabase/submit_company.sql`) lets anyone add a startup; it lands as **pending** and enters the arena only after review. URL auto-fill pre-populates name / pitch / logo from the site.
- **A populated arena** — ~255 seeded startups across 21 categories and 8 regions (with strong LatAm coverage), everyone launching Provisional so the crowd decides.
- **"I don't know this company"** — a per-company obscurity signal, separate from a toss-up skip.
- **Eligibility & lifecycle** — only private, venture-backed, alive companies compete; those that IPO / get acquired / shut down *graduate* into an archived hall of fame (excluded from the rankings, profile preserved).

## 🔜 Next — a credible MVP (what a small group needs)
- **Ship it live** — production deploy (with a preview/staging environment) so the app can be played and iterated on for real.
- **Data-quality pass** — verify the hand-seeded 255 (founders, funding, HQ, logos, dead links) so the rankings start from trustworthy facts.
- **Submission moderation** — a simple approve/reject path for pending submissions (dashboard-driven for now; an in-app admin role comes later, when volume needs it).
- **Wiki-style suggest-edit flow** — community edits to company profiles via the `revisions` table, gated by credibility tier, with full history and reversibility.

## ⏳ Later — growth, virality & scale (on the roadmap, not the MVP)
- **Share cards + dynamic Open Graph images** — a branded, spoiler-friendly "I called X over Y" card per result, each with a canonical public URL. The primary growth loop — turned on once the core is validated with real players.
- **Public, crawlable pages** — per-company profile routes (`/c/[slug]`) and a public leaderboard for SEO and shareable links; also the surface the share cards and badge point at.
- **Embeddable "Ranked on ConvictionELO" badge** — companies embed their rank on their own sites (à la G2 / Product Hunt), turning the subjects of the ranking into its distributors.
- **Confidence-aware ratings (Glicko-2 / rating deviation)** — graduate from raw Elo so new and inactive companies are handled well and noise is damped at scale (the move chess.com and Lichess both made).
- **Anti-manipulation hardening** — cohort/split analysis over the append-only votes log to detect and discount brigading; per-IP rate limits and stronger uniqueness guarantees. (Needed before any high-traffic public push.)
- **Weekly "movers" + season resets** — recurring, shareable content.
- **"Conviction strength" second tap** — slight edge vs. strong call → a bigger Elo swing.
- **Vote-split insights** — "operators vs. investors disagreed on this one."
- **Leagues / friends / invites** — social network effects.
- **Community moderation tooling** — higher trust tiers unlock edit approval and abuse flagging, so moderation scales without a central team (the Lichess model).

## 💭 Exploring
- **Sustainability / business model** — keep the daily game and the code free and open, and monetize the *data layer*: paid access to analytics, historical ranking movements, and a database/API of the ecosystem (open-core, à la PostHog / Supabase — see the note below). The trusted, durable, comparable rankings are the asset.
- **Public read API** — let third parties build on the data (newsletters, bots, "ConvictionELO for [vertical]"); the free tier of the data layer above.
- **New verticals** — the same "Elo over time for dispersed actors who compete only indirectly" applied to **VCs**, funds, agencies, or other industries. See [About](https://github.com/mancunianinnyc/ConvictionELO/wiki/About).
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
