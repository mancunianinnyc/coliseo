# Pre-Launch Checklist

Two tiers, because "show a few friends" and "post to Hacker News" have very
different bars:

- **Soft launch (small group)** — the minimum to hand the live URL to friends
  and get real play + feedback. This is the MVP gate.
- **Full public launch** — additional hardening before any high-traffic,
  adversarial audience (HN / Product Hunt / press).

---

## A. Soft launch (small group) — the MVP gate

### 1. Clear the test data ⚠️ required
While building, we created throwaway test votes and profiles — and those votes
also nudged the leaderboard's Elo scores. This resets the whole database back to
the exact seeded starting state (clears votes/profiles/revisions/submissions AND
restores every company's ratings), then re-seeds:

```bash
npm run db:reset-test-data
```

(Optional, for a truly fresh slate: in the Supabase dashboard go to
**Authentication → Users** and delete the anonymous test users too.)

### 2. Rotate the database password 🔐 required
The Supabase **database password** was shared in chat during setup, so treat it
as compromised. In the dashboard: **Project Settings → Database → Reset database
password**, then update `SUPABASE_DB_URL` in your local `.env.local`. (This
password is only used by the admin scripts, never by the app itself.)

### 3. Deploy to production 🚀 required
The app is deployed on Vercel as `convictionelo`. Keep GitHub `main` as the
canonical production path and use preview deployments for feature branches/PRs.

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Vercel
  environment variables — **never** in code.
- Avoid ad hoc production CLI deploys except emergency rollback.
- Before broad launch, attach the canonical domain and redirect Vercel preview
  aliases away from public marketing links.

### 4. Know how to moderate submissions ✍️ required
Anyone can now submit a company (`submit_company` RPC); it lands as
**`status='pending'`** and is hidden from the arena until you approve it. There's
no in-app admin UI yet — you moderate from the Supabase dashboard / SQL editor:

```sql
-- See the queue
select id, name, website, category, region, submitted_by, created_at
  from companies where status = 'pending' order by created_at desc;

-- Approve (it enters the arena immediately, Provisional)
update companies set status = 'live'     where id = <id>;

-- Reject (kept out; delete if you'd rather it vanish)
update companies set status = 'rejected' where id = <id>;
```

### 5. Spot-check the prominent companies
The ~255 seed profiles are hand-compiled and will contain errors. Before friends
see them, at least eyeball the best-known names (logos load, domains resolve,
funding/HQ not wildly wrong). Data lives in `lib/companies.data.ts`; a re-seed via
`npm run db:reset-test-data` applies edits.

---

## B. Before a full public launch (HN / Product Hunt)

Everything above, plus:

### 6. Full data verification
Work through `lib/companies.data.ts` properly — founders, funding, valuation, HQ,
team size, categories, domains, social links. Click through and fix 404s / wrong
logos. Public scrutiny is much higher than a friend group's.

**Verify + broaden the Early stage.** The taxonomy is now three tiers
(Early / Growth / Late — see `supabase/stage_early.sql`), and 17 early-stage
companies (a YC W25/F25 cohort) are seeded at the end of `lib/companies.data.ts`.
Their facts are lightly sourced — **spot-check domains, founders and founding
years**, run `npm run logos:fetch` to pull their logos, and broaden beyond the
current US-only set (international / LatAm early-stage is still thin).

### 7. Review eligibility & graduates
The seed marks ~20 companies as graduated (public/acquired) in the `EXITS` map in
`lib/companies.data.ts` — sanity-check that list and add any that IPO'd / were
acquired since. Only private, venture-backed, alive companies should be `active`.

### 8. Review Row-Level Security
Double-check the policies in `supabase/schema.sql` and the SECURITY DEFINER
functions (`supabase/cast_vote.sql`, `supabase/submit_company.sql`) so nobody can
vote as someone else, write ratings directly, or push a company straight to
`live`.

Launch hardening has been applied and checked in as `supabase/launch_hardening.sql`:
FK indexes, optimized `auth.uid()` RLS policies, duplicate-vote race protection,
private RPC rate-limit plumbing, and revoked `anon`/`public` execute grants. The
remaining signed-in `SECURITY DEFINER` advisor warning is expected while the
browser calls `cast_vote`/`submit_company` directly through Supabase.

### 9. Anti-manipulation / rate limiting
Anonymous accounts are free to mint, so `cast_vote`'s 3-per-day limit is
per-account, not per-person — a determined brigade could skew a ranking.

Current baseline:
- `cast_vote` is limited per user and per IP over a short window.
- `submit_company` is limited per user and per IP over a daily window.
- `votes` has a unique `(voter_id, dimension, vote_day)` index to protect
  against concurrent duplicate votes.

Before a high-traffic post, add Vercel Firewall rules for `/api/enrich`, consider
CAPTCHA on suspicious submission patterns, and add dashboard monitoring for vote
velocity by IP/user-agent/cohort.

### 10. Privacy note / terms
The app creates accounts (anonymous) and stores votes — add a short privacy note
before you drive real traffic.

### 11. A plan for submissions at volume
Moderating via the dashboard is fine for a trickle. If a public post floods the
`pending` queue, decide who reviews and how fast (and consider the roadmap's
credibility-gated community moderation).

### 12. CI and branch protection
Require the GitHub Actions CI workflow on `main` before public launch. Recommended
branch protection: require PRs, require CI, disallow force-pushes, and squash or
linearize merges.

### 13. Observability
Add production error monitoring and decide where Vercel/Supabase alerts should
go. At minimum, watch RPC errors, `/api/enrich` failures, signup spikes, and vote
write failures during launch windows.

---

*See `CLAUDE.md`, `ROADMAP.md`, and `ConvictionELO-spec.md` for the full product +
technical picture.*
