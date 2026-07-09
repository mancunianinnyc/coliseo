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

> Legend: ✅ shipped · 🔜 next · ⏳ later · 💭 exploring

---

## ✅ Shipped
- **Daily vote loop** — 3 picks a day, one per dimension (Value / Growth / Workplace); tap to choose, provisional select-then-confirm so you can change your mind.
- **Leaderboards** — Overall + per-dimension tables, filterable by category / region / stage.
- **Pseudonymous accounts** — anonymous auth (no PII); daily streak → credibility tier → vote weight.
- **Server-authoritative scoring** — the `cast_vote` Postgres function (`supabase/cast_vote.sql`) validates each vote, applies the Elo atomically, and enforces the 3-picks-per-day limit. Ratings cannot be forged client-side.
- **Rich company profiles** — Crunchbase-style dossiers (description, founded, HQ, team size, funding, valuation, founders, tags, links), self-hosted logos, and URL auto-fill on the Submit page.

## 🔜 Next — the growth + trust core
- **Share cards + dynamic Open Graph images** — a branded, spoiler-friendly "I called X over Y" card per result, each with a canonical public URL. The primary growth loop.
- **Embeddable "Ranked on ConvictionELO" badge** — companies embed their rank on their own sites (à la G2 / Product Hunt), turning the subjects of the ranking into its distributors.
- **Confidence-aware ratings (Glicko-2 / rating deviation)** — graduate from raw Elo so new and inactive companies are handled well and noise is damped at scale (the move chess.com and Lichess both made).
- **Anti-manipulation hardening** — cohort/split analysis over the append-only votes log to detect and discount brigading; per-IP rate limits and stronger uniqueness guarantees.
- **Wiki-style suggest-edit flow** — community edits to company profiles via the `revisions` table, gated by credibility tier, with full history and reversibility.

## ⏳ Later
- **Public read API** — let third parties build on the data (newsletters, bots, "ConvictionELO for [vertical]").
- **Weekly "movers" + season resets** — recurring, shareable content.
- **"Conviction strength" second tap** — slight edge vs. strong call → a bigger Elo swing.
- **Vote-split insights** — "operators vs. investors disagreed on this one."
- **Leagues / friends / invites** — social network effects.
- **Community moderation tooling** — higher trust tiers unlock edit approval and abuse flagging, so moderation scales without a central team (the Lichess model).

## 💭 Exploring
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
