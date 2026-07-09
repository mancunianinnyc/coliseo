# Pre-Launch Checklist

Things to do **before** opening ConvictionELO to the public. Work top to bottom.

## 1. Clear the test data ⚠️ required

While building, we created throwaway test votes and profiles — and those votes
also nudged the leaderboard's Elo scores. This command resets the whole database
back to the exact seeded starting state (clears votes/profiles/revisions AND
restores every company's ratings), then re-seeds the companies:

```bash
npm run db:reset-test-data
```

After it runs, the leaderboard is exactly as designed and there's no test
activity anywhere.

(Optional, for a truly fresh slate: in the Supabase dashboard go to
**Authentication → Users** and delete the anonymous test users too.)

## 2. Rotate the database password 🔐 required

The Supabase **database password** was shared in chat during setup, so treat it
as compromised. In the Supabase dashboard: **Project Settings → Database → Reset
database password**, then update `SUPABASE_DB_URL` in your local `.env.local`.
(This password is only used by the admin scripts, never by the app itself.)

## 3. Confirm secrets are safe

- `.env.local` holds all keys/passwords and is **git-ignored** — it must never
  appear on GitHub. (`.env.example` lists the key *names* only, no values.)
- When deploying (Vercel), set `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the host, not in code.

## 4. Known gaps to close before/at launch

These are expected TODOs, not bugs:

- **Verify the company data.** The ~255 seed companies (founded year, HQ, team
  size, funding, valuation, founders, categories, domains) were hand-compiled
  from public knowledge and will contain errors and stale figures — spot-check
  the prominent ones especially. Data lives in `lib/companies.data.ts`; a re-seed
  via `npm run db:reset-test-data` applies any edits. Social links and a few
  domains are best-guess; click through and fix 404s / wrong logos.
- **Review eligibility & graduates.** The seed marks ~20 companies as graduated
  (public/acquired) in the `EXITS` map in `lib/companies.data.ts` — sanity-check
  that list (and add any that IPO'd/were acquired since). Only private,
  venture-backed, alive companies should be `active`.
- **Review Row-Level Security.** Double-check the policies in
  `supabase/schema.sql` (+ the `cast_vote` function in `supabase/cast_vote.sql`)
  so nobody can vote as someone else or push a company straight to "live".

## 5. Nice-to-haves

- Privacy note / terms, since the app creates accounts (anonymous ones) and stores votes.
- A plan for who moderates company submissions once strangers can add them.

---

*See `CLAUDE.md` and `ConvictionELO-spec.md` for the full product + technical picture.*
