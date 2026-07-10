# How ConvictionELO scoring works

ConvictionELO turns thousands of quick head-to-head votes into a live ranking of
startups. This page explains exactly how — in plain English first, with the
precise formulas at the end for anyone who wants to check our math. The code is
open source: the rating logic lives in [`lib/elo.ts`](./lib/elo.ts) (pure,
unit-testable) and the authoritative server version in
[`supabase/cast_vote.sql`](./supabase/cast_vote.sql).

"Check our math" is a feature, not a slogan — a ranking is only worth trusting if
you can see how it's made.

---

## What we're measuring

Not popularity, and not our opinion — **the crowd's conviction**. Every company
carries a live rating on three independent questions:

- **💰 Value** — which will be worth more in 10 years?
- **📈 Growth** — which will grow faster this year?
- **💼 Workplace** — which would you rather work at?

A company can lead on one and trail on another. The three ratings are kept
completely separate.

## The daily game

- Each **day asks one question**, rotating through Value → Growth → Workplace so
  everyone plays the same question on the same day.
- You get **three rounds a day**, played "king of the hill": you pick a winner,
  that company **stays on** and faces a fresh challenger, and so on. Three votes,
  then you're done until tomorrow.
- The three-a-day scarcity is deliberate — it makes each vote matter and gives a
  reason to come back, instead of binge-and-churn.

## The rating: Elo

We use **Elo** — the same rating system that ranks chess players and tennis
pros. The idea is simple:

1. **Everyone starts at 1500.** Win a head-to-head and your rating goes up; lose
   and it goes down.
2. **Upsets count for more.** Before each matchup the system has an expectation
   of who "should" win, based on their current ratings. Beating a heavy favourite
   moves the needle a lot; beating a clear underdog barely moves it. So backing a
   surprising winner is where the real signal — and the fun — is.
3. **New companies are Provisional.** A company with few votes has an unsettled
   rating, so its score swings faster at first (a higher "K-factor"), then
   stabilises as the votes add up.

## Not every vote counts the same

**Your track record earns you weight.** Playing every day builds a streak, which
raises your **credibility tier**, which slightly increases how much your votes
move ratings:

| Streak | Tier | Vote weight |
|-------:|------|:-----------:|
| 0–1 | Rookie | ×1.00 |
| 2+ | Regular | ×1.08 |
| 4+ | Sharp | ×1.15 |
| 7+ | Analyst | ×1.22 |
| 14+ | Oracle | ×1.28 |
| 30+ | Legend | ×1.35 |

Committed, consistent voters nudge the rankings a little harder than drive-by
votes — but no one can dominate, and the effect is modest by design.

## Fair matchups (so it's conviction, not brand-recognition)

If we paired a household name against a company nobody's heard of, people would
just vote for the one they recognise — and the ranking would only measure fame.
So matchmaking pairs **peers**: companies of similar **prominence** (a 1–5
fame tier) and, where possible, the same category or region. New players also
**warm up** on recognisable companies before the game introduces deeper cuts.
The goal is that you back a company because of *what it does*, not whether you've
heard of it.

## Three kinds of signal

Beyond the rating itself, ConvictionELO captures:

- **Conviction** — who you back after seeing the matchup (the votes → the Elo).
- **Obscurity** — companies you mark "not familiar" (never touches Elo; it just
  tells us which companies aren't well known yet).

Marking a company unfamiliar is useful signal, never a penalty.

## What this is *not*

Ratings are the **crowd's opinion**, compiled from public information — not fact,
not financial advice, and not an endorsement. Company details can be incomplete
or out of date and are corrected over time. Don't make investment or career
decisions based on them.

---

## For the curious: the exact formulas

Given a winner with rating `Rw` and a loser with rating `Rl` on some dimension:

**Expected score** (probability the winner was favoured):

```
E = 1 / (1 + 10^((Rl − Rw) / 400))
```

**K-factor** (how much a single result can move a rating):

```
K = 48   if the company is Provisional (< 10 games)
    20   if it's a Late-stage company
    32   otherwise
```

**Rating change**, scaled by the voter's weight `w` (from the tier table above):

```
Δwinner = round( K_winner × (1 − E) × w )
Δloser  = round( K_loser  × (0 − (1 − E)) × w )
```

`E` is the winner's expected score. If the winner was a heavy favourite, `E` is
close to `1`, so `1 − E` is small and the rating barely moves. If the winner was
the underdog, `E` is small, `1 − E` is large, and the swing is big — that's why
**upsets count for more**. Everyone starts at `1500` with `games = 0`
(Provisional).

This runs server-side in a `SECURITY DEFINER` Postgres function so ratings can't
be forged by the client — see [`supabase/cast_vote.sql`](./supabase/cast_vote.sql).
The pure, framework-agnostic version (and its unit-test target) is
[`lib/elo.ts`](./lib/elo.ts).
