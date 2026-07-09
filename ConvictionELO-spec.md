# ConvictionELO — Product Spec & Build Handoff

*Last updated: 7 July 2026. This doc is the single source of truth for the ConvictionELO MVP. It's written to be pasted into or read by another builder (Lovable, Replit, v0, a developer) to continue iterating. A working front-end prototype exists: `startup-elo-mvp.html` (open in any browser — no backend, state resets on refresh).*

---

## 1. One-liner

**ConvictionELO** is a daily game where people vote on head-to-head startup matchups. Each vote nudges a live Elo rating, every rating change is a shareable object, and showing up daily builds your credibility. Think Wordle's daily ritual × Fantasy Premier League's league tables × a startup-ranking wiki.

The name has a deliberate double meaning: *conviction* is both the investor term (a high-conviction bet) and what the daily streak literally measures — how much you've earned the right to have your calls count.

---

## 2. Core loop (the whole product in one sentence)

Land → see today's matchup → tap the winner → watch the Elo move → get prompted to share the result or submit a company. Everything else supports that loop.

**Daily structure:** 3 picks per day, one per dimension (see §3). Complete all 3 to keep your streak alive. Scarcity (only 3/day) is intentional — it makes each vote matter and gives a reason to return tomorrow rather than binge-and-churn.

---

## 3. The three questions (dimensions)

Each daily set walks the user through one pick per dimension, in order:

| # | Dimension | Question shown | Feeds table |
|---|-----------|----------------|-------------|
| 1 | **Value** | "Which will be *worth more* in 10 years?" | 💰 Value |
| 2 | **Growth** | "Which will *grow faster* this year?" | 📈 Growth |
| 3 | **Workplace** | "Which would you *rather work at* for the next 10 years?" | 💼 Workplace |

- Each dimension maintains its **own independent Elo rating** per company. A company can be #1 on Workplace but #11 on Growth — that divergence is itself content.
- The **Workplace** question is deliberately doing double duty: it's a proxy for durability/staying power *and* culture/desirability.
- **Decision:** single-tap voting for now. A "conviction strength" second tap (slight edge vs. strong call, mapping to a bigger Elo swing) is a noted future enhancement that fits the brand name — not built yet.

### Composite / Overall ranking
There is a single headline **🏆 Overall** table = the **equal-weighted average** of each company's Value, Growth, and Workplace Elo. This is the default table.

> **Known tradeoff:** because a company's three ratings are correlated, an equal-weighted average of Elos compresses the spread — the Overall table looks slightly flatter than the individual ones. Fine for MVP. Easy future tuning options: weight Value higher, or rank by *average rank* instead of *average Elo* for more separation at the top.

---

## 4. Ranking system (Elo)

Simple per-question Elo updates now; architected so every individual comparison is stored and can later be re-estimated with Bradley–Terry or TrueSkill without rebuilding the product.

- **Expected score:** `E_a = 1 / (1 + 10^((elo_b - elo_a)/400))`
- **Update on win:** `elo += K × (1 - E) × voteWeight`; loser is symmetric.
- **K-factor:** `48` while provisional (<10 matchups on that dimension), else `20` for Late-stage companies, `32` for Growth-stage. (Stage-aware K dampens noise on well-established names.)
- **voteWeight:** comes from the voter's credibility tier (§5), 1.0–1.35×. Showing up daily literally makes your vote count more.
- **Confidence label** shown on cards/profiles: **Provisional** (<25 matchups) vs **Established** (≥25). Prototype uses a visible label rather than pretending every rank is equally certain. A "Thin sample" state is a possible third tier.
- **New companies** enter all three tables at **Elo 1500**, Provisional.

---

## 5. Streak & credibility (the retention engine)

Completing your 3 daily picks increments a **streak** (consecutive days). The streak drives a **credibility tier**, and the tier sets your **vote weight**.

| Tier | Streak ≥ | Vote weight |
|------|----------|-------------|
| Rookie | 0 | ×1.00 |
| Regular | 2 | ×1.08 |
| Sharp | 4 | ×1.15 |
| Analyst | 7 | ×1.22 |
| Oracle | 14 | ×1.28 |
| Legend | 30 | ×1.35 |

- **Missed day = decay one tier** (drops your streak to the floor of the tier below), *not* a hard reset to zero. Chosen over Duolingo-style wipe as more forgiving while keeping daily urgency.
- Open future decision: consider a "streak freeze" token as an even gentler option later.
- **Season** still exists conceptually as the long-arc container (e.g. monthly reset of table *movement*/movers), but the streak is the daily hook, not the season.

---

## 6. Screens / features (MVP surface)

1. **Vote** — the home screen. Two company cards, one question, one tap. Reveals Elo deltas (▲/▼), a verdict line (chalk pick / upset / coin-flip based on the crowd expected score), then Next / Share prompts. Progress dots + "picks left today" + live vote-weight are always visible. Matchmaking prefers **similar-rated peers** (cohorting) on the active dimension.
2. **Daily complete** — after 3 picks: recaps the day's three verdicts in one box (pre-share summary), ticks the streak, shows the new tier.
3. **Tables (leaderboards)** — rating selector (Overall / Value / Growth / Workplace) **×** league dimension (Category / Region / Stage) **×** filter chips (🌍 Global + each sub-league). Rows show rank, logo, Elo, and per-dimension weekly movement. Football-table feel, not one monolithic list.
4. **Profile** — public dossier: composite Overall rank + Elo up top, then the three dimension ratings with ranks, confidence, total matchups, website, and a "✏️ Suggest an edit" control (wiki-style, creates a pending revision — stubbed in prototype).
5. **Submit** — URL-first form (auto-enrich name/logo/category from the site in the real build), plus a lightweight community-validation checklist (correct website / real founders / not a duplicate). New submissions are **pending** and reviewed before going live.
6. **Share card** — the growth engine. A branded card naming the dimension: "I called who'll grow faster: X over Y" with the Elo delta, new rank, and the user's streak. Every result and every table/profile should have a canonical public URL with a dynamic Open Graph image.

---

## 7. Data model

**Company** (prototype shape):
```js
{
  id, name, website,            // "openai.com"
  category,                      // AI Infra | Fintech | Dev Tools | Consumer | SaaS | Hardware | Health
  region,                       // US | Europe | APAC | Israel | LatAm | Other
  stage,                        // Growth | Late
  blurb,                        // one-line pitch
  logoFallbackGradient,         // used if logo fails to load
  ratings: {
    V: { elo, games, weekMovement, seasonStart },   // Value
    G: { elo, games, weekMovement, seasonStart },   // Growth
    D: { elo, games, weekMovement, seasonStart }     // Workplace
  }
}
```

**What must be stored from day one** (even if unused at launch): every individual **comparison / vote** as its own row — `{ voterId, companyA, companyB, dimension, winner, voterTierAtVote, timestamp }`. This is what lets you later compute splits ("operators vs investors disagreed"), re-estimate ratings with better models, and detect abuse.

**Logos:** prototype pulls from Clearbit (`https://logo.clearbit.com/{domain}`) with a coloured-initial gradient fallback on error. For production, cache logos yourself (Clearbit's free tier is being wound down under HubSpot) or use website favicon/OG scraping.

---

## 8. Design system

**Aesthetic:** light, airy, playful/game-like. White cards with soft shadows on an off-white background with faint teal/sky/coral gradient washes. Vibrant accents. No purple anywhere (explicitly removed).

**Colour tokens:**
```
--bg:    #f7f8fc    (app background)
--ink:   #1c1a2e    (primary text)
--muted: #7b7893    (secondary text)
--card:  #ffffff    --soft: #eef0f7   --line: #e6e8f2
--teal:  #0eb6a6    --teal2: #0a8f93   (primary brand / accents — "greeny blue")
--sky:   #37b6ff    --mint:  #22c9a0
--coral: #ff6b8b    --gold:  #ffb638   --lime: #8fd93a   --red: #f4506b
```
Primary brand gradient: `teal → sky`. Positive/win: mint. Alerts/upsets: coral/gold.

**Typography (distinctive pairing, intentionally not default):**
- **Fraunces** (serif, characterful) — logo-adjacent headlines, the hero question, section titles, share-card verdicts. Weights 500–700, italic for the share-card "I called…" line.
- **Space Grotesk** (grotesk) — all UI, body, numbers, buttons. Weights 400–700.
- Both via Google Fonts.

**Brand mark:** ⚡ + "Conviction**ELO**" (the "ELO" in a teal→sky gradient). Domain used in mocks: `convictionelo.com`.

---

## 9. Recommended build stack

From the original blueprint, the lowest-friction path to a public, credible, shareable MVP:

- **Lovable** — generate the first working app (landing, submission, profiles, auth scaffold, Supabase tables) via chat; GitHub sync keeps code portable.
- **Supabase** — backend from day one: Postgres, auth, storage, realtime, edge functions, **Row-Level Security**. Public reads allowed selectively; inserts/edits/approvals/moderation are role-gated policies, not just UI.
- **Vercel + Next.js** — route-level metadata and `opengraph-image` / `twitter-image` for the dynamic share cards. This is why Next-centric > Vite here (Bolt's Supabase path notably doesn't support Next.js).
- **OpenAI Responses API (web search tool)** — *propose* company summaries/founders/links with citations for a human/mod to accept. Never auto-publish canonical facts.
- **GitHub + Copilot cloud agent** — control plane + backlog worker (merge-duplicate flow, moderator audit screen, anti-spam thresholds, etc.).
- **Playwright** — smoke suite before launch: sign-in, submit-company, approve-edit, cast-vote, share-page render.

Alternatives: Replit Agent (strongest single-vendor prompt→deploy), v0 (design-polish + full-stack generation). Both viable; keep the Supabase + Next + OG-image spine.

### Suggested Supabase tables (starting point)
- `companies` (public read) — profile fields + denormalised current Elo per dimension for fast tables.
- `ratings` — one row per company × dimension (elo, games, movement) if you prefer normalised.
- `votes` — the append-only comparison log (§7). Never deleted.
- `profiles` — user, current streak, tier, last_active_date.
- `revisions` — suggested edits with `status: pending|approved|rejected`, diff, author, reviewer. Public page renders last approved version.
- `submissions` — pending companies before they enter the arena.

---

## 10. Roadmap / deferred

**In the MVP:** submit, vote (3/day across 3 dimensions), tables (Overall + 3 dimensions × Category/Region/Stage), profiles, suggest-edit (pending), share cards, streak + credibility.

**Next up (natural increments):**
- Trust/moderation layer proper: revision history + diffs, pending-changes review, user roles (suggest → approve), attributable/reversible edits.
- Share-card variants + dynamic OG image generation.
- "Conviction strength" second tap.
- Vote-split insights ("founders vs investors disagreed on this one").
- Weekly "movers" page and season resets.

**Explicitly deferred (do NOT launch with):** founder accounts, investor verification, deep private-company metrics, mobile app, paid plans, and — importantly — **prediction/betting markets**. The betting adjacency is real but the event-contract regulatory surface (CFTC framing, Polymarket's split legal entities) makes it a phase-2+ roadmap note, not a launch feature. Build the trusted ranking game first; the market layer only becomes interesting once the ranking itself is trusted.

---

## 11. Bootstrap prompt (paste into Lovable / Replit / v0)

> Build **ConvictionELO**, a daily startup-ranking game (light, airy, playful; teal `#0eb6a6` + sky `#37b6ff` accents, no purple; Fraunces for headlines, Space Grotesk for UI). Stack: Next.js + Supabase (Postgres, auth, storage, RLS) on Vercel, with dynamic Open Graph share images.
>
> Core loop: a signed-in user gets **3 daily head-to-head matchups**, one per dimension — **Value** ("worth more in 10 years?"), **Growth** ("grow faster this year?"), **Workplace** ("rather work at for 10 years?"). Each pick is one tap between two company cards (logo, name, category·region·stage, one-line pitch). Each dimension has its own **Elo** rating per company (expected = 1/(1+10^((eb-ea)/400)); K=48 if <10 games else 20 late-stage / 32 growth-stage; multiply the delta by the voter's credibility weight). Store **every vote as an append-only row** (voter, companyA, companyB, dimension, winner, voterTier, timestamp).
>
> Completing all 3 picks increments a **daily streak** → **credibility tier** (Rookie/Regular/Sharp/Analyst/Oracle/Legend at streaks 0/2/4/7/14/30 → vote weight 1.00→1.35×). A missed day decays one tier (not a full reset).
>
> Screens: **Vote** (with progress dots + picks-left + live vote weight; matchmaking prefers similar-Elo peers), **Daily complete** (recap 3 verdicts, streak up), **Tables** (a default **Overall** table = equal-weighted average of the 3 Elos, plus per-dimension tables, each filterable by Category / Region / Stage with a Global option and per-dimension weekly movement), **Profile** (composite rank + 3 dimension ratings, confidence label Provisional/Established, "suggest an edit" creating a pending revision), **Submit** (URL-first; new companies enter all 3 tables at Elo 1500, pending review), and a branded **share card** per result ("I called who'll grow faster: X over Y" + Elo delta + streak) with a dynamic OG image.
>
> Seed with ~18 well-known startups (OpenAI, Stripe, Anthropic, SpaceX, Databricks, Canva, Ramp, Vercel, Figma, Notion, Perplexity, Retool, Rippling, Deel, Wiz, Mistral, Revolut, Nubank). Pull logos from the company domain with a coloured-initial fallback. RLS: public reads; inserts/edits/approvals are role-gated.

---

## 12. Files in this project

- `startup-elo-mvp.html` — the working interactive front-end prototype (all mechanics above, simulated, no backend). Has a "▶ new day" control to fast-forward the streak/decay for testing.
- `ConvictionELO-spec.md` — this document.
- `Startup ELO.md` — the original strategy blueprint (rationale, citations, deeper reasoning behind every decision here).
