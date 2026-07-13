"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Company, QKey } from "@/lib/types";
import { QUESTIONS, QORDER } from "@/lib/questions";
import { loadCompanies } from "@/lib/loadCompanies";
import { CATEGORIES, REGIONS } from "@/lib/companies.data";
import { useSession } from "@/lib/auth";
import { loadProfile, saveStreak } from "@/lib/profile";
import { castVote, votesTodayCount, votesLifetimeCount, exhibitionTodayCount } from "@/lib/castVote";
import { submitCompany } from "@/lib/submitCompany";
import { flagUnknown } from "@/lib/unknowns";
import {
  applyElo,
  composite,
  compositeMovement,
  confidence,
  decayedStreak,
  eloDeltas,
  eloOf,
  expected,
  tierFor,
} from "@/lib/elo";

type View = "vote" | "done" | "board" | "profile" | "submit";
type BoardQ = QKey | "ALL";

// The three arena stage tiers, in progression order — the Tables' stage filter.
const STAGES = ["Early", "Growth", "Late"] as const;

// First-run onboarding is shown once per browser. Bump the version suffix to
// re-show the explainer after a material change to its copy.
const ONBOARD_KEY = "ce_onboarded_v4";

// Exhibition bouts — the post-daily survival run. The day's champion keeps
// defending against fresh challengers; every bout is a real (append-only) vote
// that moves Elo at a QUARTER of the player's normal weight, and the day's cap
// keeps late fatigue votes from piling noise into the ratings. The scarce
// daily ritual (streak, leaderboard unlock, share card) hangs off the 3 arena
// picks only. KEEP IN SYNC WITH supabase/cast_vote.sql.
const EXHIBITION_WEIGHT = 0.25;
const EXHIBITION_CAP = 10;

function Logo({ c, cls }: { c: Company; cls: string }) {
  return (
    <div className={cls} style={{ background: c.gradient }}>
      {c.name[0]}
      {c.logoUrl && (
        <img
          src={c.logoUrl}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

interface Pick {
  q: QKey;
  win: string;
  lose: string;
  winId: number;
  loseId: number;
}

// Crisp line icons for the bottom nav (stroke = currentColor, so they inherit
// active/inactive colour and the active gradient). Line-drawn, not emoji.
function NavIcon({ name }: { name: "vote" | "tables" | "locked" | "submit" }) {
  const p = {
    width: 23,
    height: 23,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "vote")
    return (
      <svg {...p}>
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg>
    );
  if (name === "tables")
    return (
      <svg {...p}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    );
  if (name === "locked")
    return (
      <svg {...p}>
        <rect x="3" y="11" width="18" height="11" rx="2.5" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

// Only "active" companies are in the arena (eligible to be voted on & ranked).
// Graduated companies (public / acquired / dead) are archived — still viewable,
// but out of voting and the live tables.
const isActive = (c: Company) => (c.lifecycle ?? "active") === "active";

// Websites are stored as bare domains (e.g. "openai.com") and the app adds the
// scheme. Strip any accidental scheme / trailing slash so a stray "https://…"
// value can never produce a broken "https://https://…" link.
const webDomain = (w: string) => (w ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
const webHref = (w: string) => `https://${webDomain(w)}`;

export default function App() {
  const { userId, anonDisabled } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<View>("vote");
  const [streak, setStreak] = useState(0);
  const [pickIndex, setPickIndex] = useState(0);
  const [pair, setPair] = useState<[number, number]>([0, 1]);
  // Company ids already shown in today's gauntlet, so a fresh challenger isn't a
  // repeat. Reset each new day.
  const [seenToday, setSeenToday] = useState<number[]>([]);
  // Lifetime votes cast — drives the new-user warm-up ramp (see warmupFloor).
  const [lifetimeVotes, setLifetimeVotes] = useState(0);
  // A *provisional* selection for the current pick — nothing is committed
  // (no Elo persisted, no vote recorded) until commitPick(). Re-tapping the
  // other card just recomputes this, so the user can freely change their mind.
  const [decided, setDecided] = useState<null | {
    winSide: "A" | "B";
    dA: number; // delta shown on card A
    dB: number; // delta shown on card B
    eloA: number; // preview Elo shown on card A
    eloB: number; // preview Elo shown on card B
  }>(null);
  const [todaysPicks, setTodaysPicks] = useState<Pick[]>([]);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  // The current step in the daily run (the live matchup, sitting below the trail
  // of completed rounds). We scroll it to the top on each new round so the flow
  // moves naturally downward instead of snapping the user back up the page.
  const activeStepRef = useRef<HTMLDivElement>(null);
  const [boardQ, setBoardQ] = useState<BoardQ>("ALL");
  // Independent multi-axis Tables filters (category AND region AND stage), each
  // defaulting to "All". They live behind the Filter sheet so the default board
  // stays clean: Overall · All companies · Global.
  const [catFilter, setCatFilter] = useState<string>("All");
  const [regFilter, setRegFilter] = useState<string>("All");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showGrads, setShowGrads] = useState(false);
  // First-run explainer overlay — opened on a visitor's first ever load (see the
  // ONBOARD_KEY effect) and dismissed for good once they've seen it.
  const [showOnboard, setShowOnboard] = useState(false);
  // The "you've used today's 3 picks" popup — shown when a finished user lands
  // back on the Vote tab (the vote area itself is also locked when doneToday).
  const [showLimitModal, setShowLimitModal] = useState(false);
  // The "how the Elo scoring works" explainer — opened from the leaderboard
  // (where the numbers live) and the sidebar, for people new to Elo ratings.
  const [showScoring, setShowScoring] = useState(false);
  // The leaderboard is gated behind completing today's 3 picks. Persisted via
  // the profile's last_active_date, so it stays unlocked on refresh for the day.
  const [doneToday, setDoneToday] = useState(false);
  // Exhibition mode — the optional survival run after the daily 3. The run's
  // champion defends until dethroned, retired, or the daily bout cap.
  const [exhibition, setExhibition] = useState(false);
  // Bouts played today (hydrated from the server so a reload can't reset the
  // cap). The server enforces the cap authoritatively.
  const [exhibitionUsed, setExhibitionUsed] = useState(0);
  // The current run's champion — null right after a reload wiped the day's
  // picks, in which case the first exhibition bout crowns one.
  const [runChamp, setRunChamp] = useState<number | null>(null);
  const [runDefenses, setRunDefenses] = useState(0); // bouts this champion has won
  const [runOver, setRunOver] = useState<null | {
    outcome: "dethroned" | "undefeated" | "retired";
    champId: number;
    defenses: number;
    conquerorId?: number;
  }>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  // A company being "peeked" from the vote flow — a read-only dossier shown in a
  // bottom sheet so you can learn about a company you don't recognise WITHOUT
  // leaving the matchup (no vote cast, pair/pickIndex untouched).
  const [peekId, setPeekId] = useState<number | null>(null);
  const [form, setForm] = useState({ url: "", name: "", cat: "AI", reg: "US", blurb: "", logoUrl: "" });
  const [enrich, setEnrich] = useState<{ state: "idle" | "loading" | "ok" | "err"; msg: string }>({
    state: "idle",
    msg: "",
  });
  const [submitState, setSubmitState] = useState<{
    state: "idle" | "loading" | "ok" | "err";
    msg: string;
  }>({ state: "idle", msg: "" });

  useEffect(() => {
    let cancelled = false;
    loadCompanies().then((list) => {
      if (cancelled) return;
      setCompanies(list);
      const p = openingPair(list);
      setPair(p);
      setSeenToday(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Show the first-run explainer once per browser. localStorage may be
  // unavailable (private mode / blocked); if so, just skip it silently.
  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARD_KEY) !== "1") setShowOnboard(true);
    } catch {
      /* no-op */
    }
  }, []);

  // Once the pseudonymous identity settles, hydrate the persisted streak/tier
  // from `profiles` (the row is created lazily by saveStreak, not here).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadProfile(userId).then((p) => {
      if (cancelled) return;
      setStreak(p.streak);
    });
    // Resume today's progress from the server so a reload can't reset the daily
    // count. How many of today's 3 picks are already cast decides where we pick
    // up (and whether the day is already done). This is what actually enforces
    // the 3-per-calendar-day limit in the UI; the DB enforces it authoritatively.
    votesTodayCount(userId).then((n) => {
      if (cancelled) return;
      setPickIndex(n);
      if (n >= 3) setDoneToday(true); // out of picks — unlock tables, lock voting
    });
    // Warm-up ramp input: how many votes this user has ever cast.
    votesLifetimeCount(userId).then((n) => {
      if (!cancelled) setLifetimeVotes(n);
    });
    // Exhibition bouts already played today, so the cap survives a reload.
    exhibitionTodayCount(userId).then((n) => {
      if (!cancelled) setExhibitionUsed(n);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // When a finished user is on the Vote tab (a reload, or tapping Vote again
  // after completing the day), surface the daily-limit popup. Never fires the
  // moment they finish their 3rd pick, since that routes to the "done" view.
  useEffect(() => {
    if (doneToday && view === "vote" && !exhibition) setShowLimitModal(true);
  }, [doneToday, view, exhibition]);

  // On advancing to rounds 2 and 3, glide the just-earned breadcrumb to the top
  // of the viewport, so the user actually SEES "✓ you backed X" and then the next
  // matchup right below it — the run reads as one continuous downward journey.
  // (Scrolling the matchup itself to the top would push the new breadcrumb off
  // the top edge, which is why it felt invisible.) Round 1 is left alone.
  useEffect(() => {
    if (view === "vote" && pickIndex > 0 && pickIndex < 3) {
      requestAnimationFrame(() => {
        const crumb = document.querySelector(".trail .tnode:last-child");
        (crumb ?? activeStepRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [pickIndex, view]);

  const tier = tierFor(streak);
  // One question per day, rotating by UTC calendar day so everyone gets the same
  // question on the same day. It stays fixed across all 3 of the day's rounds.
  const voteQ = QORDER[Math.floor(Date.now() / 86_400_000) % QORDER.length];
  // New-user warm-up: only surface companies at/above this prominence tier until
  // the user has played a bit, so their first matchups are recognizable and the
  // game clicks before we introduce deep cuts. Defaults high (new-user-safe)
  // until the lifetime count loads.
  const warmupFloor = lifetimeVotes < 9 ? 4 : lifetimeVotes < 30 ? 3 : 1;
  // Company ids come from Supabase's identity column, not a 0-based array
  // index — always look companies up by id, never by position.
  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  // Companies eligible for the arena (voting + live rankings).
  const activeCompanies = useMemo(() => companies.filter(isActive), [companies]);
  // Newest additions (highest ids), for the desktop Discover rail — a peek into
  // the arena that doesn't leak the gated leaderboard.
  const recentlyAdded = useMemo(
    () => [...companies].sort((a, b) => b.id - a.id).slice(0, 5),
    [companies],
  );
  const graduates = useMemo(
    () =>
      companies
        .filter((c) => !isActive(c))
        .sort((x, y) => (y.exitedAt ?? "").localeCompare(x.exitedAt ?? "")),
    [companies],
  );
  const [a, b] = pair;
  const A = byId.get(a);
  const B = byId.get(b);

  // Pick a fresh challenger for a reigning company. Prefers PEERS — within ±1
  // prominence tier and, secondarily, the same category/region — above the
  // warm-up floor, so matchups are fair and recognizable rather than
  // famous-vs-obscure (which just trains brand-recognition voting). Widens the
  // net step by step if a band is too thin, and always returns something.
  // minFloor defaults to the warm-up floor; exhibition bouts pass 1 so the
  // lower-stakes run can surface deeper cuts (discovery signal).
  function pickChallenger(
    list: Company[],
    championId: number,
    qk: QKey,
    exclude: number[],
    minFloor = warmupFloor,
  ): number {
    const champ = list.find((c) => c.id === championId);
    const champP = champ?.prominence ?? 2;
    const excl = new Set([championId, ...exclude]);
    const eligible = (floor: number, peerBand: boolean) =>
      list.filter(
        (c) =>
          isActive(c) &&
          !excl.has(c.id) &&
          (c.prominence ?? 2) >= floor &&
          (!peerBand || Math.abs((c.prominence ?? 2) - champP) <= 1),
      );
    let pool = eligible(minFloor, true); // peers, above the floor
    if (pool.length < 3) pool = eligible(minFloor, false); // drop the peer band
    if (pool.length < 3) pool = eligible(1, false); // drop the floor entirely
    if (pool.length === 0) pool = list.filter((c) => isActive(c) && c.id !== championId);
    // Among the pool, prefer a same-category/region peer for a real matchup.
    const themed = pool.filter((c) => c.category === champ?.category || c.region === champ?.region);
    const finalPool = themed.length >= 3 ? themed : pool;
    const champElo = champ ? champ.ratings[qk].elo : 1500;
    const near = finalPool
      .sort((x, y) => Math.abs(x.ratings[qk].elo - champElo) - Math.abs(y.ratings[qk].elo - champElo))
      .slice(0, 8);
    return near[Math.floor(Math.random() * near.length)].id;
  }

  // The day's opening matchup: an anchor at/above the warm-up floor, then a
  // prominence-peer challenger — so even round 1 is a fair, recognizable-enough
  // matchup instead of famous-vs-obscure.
  function openingPair(list: Company[]): [number, number] {
    const eligible = list.filter((c) => isActive(c) && (c.prominence ?? 2) >= warmupFloor);
    const anchors = eligible.length ? eligible : list.filter(isActive);
    const anchor = anchors[Math.floor(Math.random() * anchors.length)];
    return [anchor.id, pickChallenger(list, anchor.id, voteQ, [])];
  }

  // Reshuffle without casting a vote: keep one company, bring a fresh challenger.
  // Used by "too close to call" (keep the reigning/left card) and "don't know them"
  // (keep the other card). Never mixes committed matchups.
  function reshuffle(keepId: number, next = companies) {
    const challengerId = pickChallenger(
      next,
      keepId,
      voteQ,
      [a, b, ...seenToday],
      exhibition ? 1 : warmupFloor,
    );
    setSeenToday((s) => [...s, challengerId]);
    setPair([keepId, challengerId]);
    setDecided(null);
  }

  // Start a brand-new day's gauntlet: two fresh, comparable companies.
  function newMatch(next = companies) {
    const p = openingPair(next);
    setPair(p);
    setSeenToday(p);
    setDecided(null);
  }

  // Provisionally select a side. Computed against the current (committed)
  // ratings without mutating anything, so tapping the other card simply
  // recomputes the preview — the pick isn't locked in until commitPick().
  function selectSide(side: "A" | "B") {
    if (!A || !B) return; // only reachable once both cards are loaded
    const qk = voteQ;
    const winner = side === "A" ? A : B;
    const loser = side === "A" ? B : A;
    // Exhibition previews show the honest quarter-weight move.
    const { dw, dl } = eloDeltas(winner, loser, qk, tier.mult * (exhibition ? EXHIBITION_WEIGHT : 1));
    const eloWinner = winner.ratings[qk].elo + dw;
    const eloLoser = loser.ratings[qk].elo + dl;
    setDecided({
      winSide: side,
      dA: side === "A" ? dw : dl,
      dB: side === "A" ? dl : dw,
      eloA: side === "A" ? eloWinner : eloLoser,
      eloB: side === "A" ? eloLoser : eloWinner,
    });
  }

  // Lock in the current provisional selection, advance the UI, and record the
  // vote on the server. The DB's cast_vote function is authoritative: it
  // validates, enforces the daily limit, and applies the real Elo change. We
  // apply an optimistic local Elo move for instant feedback, then reconcile the
  // two companies' ratings to the server's values when the call returns.
  function commitPick() {
    if (!decided) return;
    const qk = voteQ;
    const side = decided.winSide;
    const winnerId = side === "A" ? a : b;
    const loserId = side === "A" ? b : a;
    const next = companies.map((c) => ({ ...c, ratings: { ...c.ratings } }));
    const nextById = new Map(next.map((c) => [c.id, c]));
    const winner = nextById.get(winnerId)!;
    const loser = nextById.get(loserId)!;

    // Optimistic local move (instant feedback; also the offline/unconfigured
    // fallback when there's no backend or signed-in user).
    applyElo(winner, loser, qk, tier.mult);
    setCompanies(next);
    setTodaysPicks((p) => [
      ...p,
      { q: qk, win: winner.name, lose: loser.name, winId: winnerId, loseId: loserId },
    ]);
    setDecided(null);

    // Authoritative server record + Elo. Reconcile local ratings to the values
    // the DB actually applied (self-heals any optimistic drift; on refresh the
    // app reloads from the DB anyway).
    if (userId) {
      void castVote({ companyA: a, companyB: b, dimension: qk, winner: winnerId }).then(
        (outcome) => {
          if (!outcome.ok) {
            // The server rejected the pick. If it's the daily limit (e.g. a
            // second tab, or state that drifted from the server), lock voting
            // and tell the user rather than silently pretending it counted; the
            // optimistic Elo self-heals on the next reload from the DB.
            if (outcome.alreadyVoted) {
              setDoneToday(true);
              setShowLimitModal(true);
            } else {
              console.error("cast_vote failed:", outcome.error);
            }
            return;
          }
          const { winner: wId, loser: lId, winnerElo, loserElo } = outcome.result;
          setCompanies((prev) =>
            prev.map((c) =>
              c.id === wId
                ? { ...c, ratings: { ...c.ratings, [qk]: { ...c.ratings[qk], elo: winnerElo } } }
                : c.id === lId
                  ? { ...c, ratings: { ...c.ratings, [qk]: { ...c.ratings[qk], elo: loserElo } } }
                  : c,
            ),
          );
        },
      );
    }

    const nextIndex = pickIndex + 1;
    setPickIndex(nextIndex);
    if (nextIndex >= 3) {
      setStreak((s) => {
        const bumped = s + 1;
        if (userId) void saveStreak(userId, bumped); // persist the day's streak
        return bumped;
      });
      setDoneToday(true); // today's picks are in — unlock the tables
      setView("done");
    } else {
      // King of the hill: the winner stays on the left and faces a fresh
      // challenger on the right. Same question all day (voteQ is date-based).
      const challengerId = pickChallenger(next, winnerId, qk, [a, b, ...seenToday]);
      setSeenToday((s) => [...s, challengerId]);
      setPair([winnerId, challengerId]);
      setDecided(null);
    }
  }

  // "I don't know this company." Records an obscurity signal (not a vote — never
  // touches Elo) and swaps that card out for a fresh challenger, keeping the
  // other company in place so a running champion isn't lost.
  function markUnknown(company: Company) {
    if (userId) void flagUnknown(userId, company.id, voteQ);
    reshuffle(company.id === a ? b : a);
  }

  // ---- Exhibition bouts: the post-daily survival run ----------------------
  // The day's champion keeps defending, king-of-the-hill style, until it's
  // dethroned, retires (player walks away), or the daily cap is hit. Every
  // bout is a real ¼-weight vote; challengers come from deeper in the arena
  // (floor 1), so surplus enthusiasm becomes long-tail discovery signal.

  // Start (or restart) a run. Carries the day's champion when we have it; on a
  // reload that wiped the day's picks, bout 1 crowns a champion instead.
  function startExhibition(champId: number | null = todaysPicks[todaysPicks.length - 1]?.winId ?? null) {
    setRunOver(null);
    setRunDefenses(0);
    setRunChamp(champId);
    if (champId != null) {
      nextBout(champId);
    } else {
      // No champion survived the reload — seat a fresh anchor on the left;
      // whoever wins bout 1 is crowned (runChamp stays null until then).
      const anchors = activeCompanies.filter((c) => !seenToday.includes(c.id));
      const anchor = (anchors.length ? anchors : activeCompanies)[
        Math.floor(Math.random() * (anchors.length || activeCompanies.length))
      ];
      nextBout(anchor.id);
    }
    setExhibition(true);
    setView("vote");
  }

  // Fresh challenger for the run's current king. Floor 1 → deep cuts welcome.
  function nextBout(champId: number, next = companies) {
    const challengerId = pickChallenger(next, champId, voteQ, [a, b, ...seenToday], 1);
    setSeenToday((s) => [...s, challengerId]);
    setPair([champId, challengerId]);
    setDecided(null);
  }

  // Lock in an exhibition bout. Mirrors commitPick, but at ¼ weight, with the
  // run's survival bookkeeping instead of the daily pickIndex/streak logic.
  function commitExhibition() {
    if (!decided) return;
    const qk = voteQ;
    const side = decided.winSide;
    const winnerId = side === "A" ? a : b;
    const loserId = side === "A" ? b : a;
    const next = companies.map((c) => ({ ...c, ratings: { ...c.ratings } }));
    const nextById = new Map(next.map((c) => [c.id, c]));
    const winner = nextById.get(winnerId)!;
    const loser = nextById.get(loserId)!;

    // Optimistic quarter-weight move; reconciled to the server's values below.
    applyElo(winner, loser, qk, tier.mult * EXHIBITION_WEIGHT);
    setCompanies(next);
    setDecided(null);
    const used = exhibitionUsed + 1;
    setExhibitionUsed(used);

    if (userId) {
      void castVote({ companyA: a, companyB: b, dimension: qk, winner: winnerId, kind: "exhibition" }).then(
        (outcome) => {
          if (!outcome.ok) {
            if (outcome.limitReached) {
              // A second tab (or drifted state) already used the cap — close
              // out the run; the optimistic Elo self-heals on reload.
              setExhibitionUsed(EXHIBITION_CAP);
              setRunOver((r) => r ?? { outcome: "retired", champId: winnerId, defenses: runDefenses });
            } else {
              console.error("cast_vote (exhibition) failed:", outcome.error);
            }
            return;
          }
          const { winner: wId, loser: lId, winnerElo, loserElo } = outcome.result;
          setCompanies((prev) =>
            prev.map((c) =>
              c.id === wId
                ? { ...c, ratings: { ...c.ratings, [qk]: { ...c.ratings[qk], elo: winnerElo } } }
                : c.id === lId
                  ? { ...c, ratings: { ...c.ratings, [qk]: { ...c.ratings[qk], elo: loserElo } } }
                  : c,
            ),
          );
        },
      );
    }

    if (runChamp == null) {
      // Crowning bout: the winner becomes the run's champion with 1 win.
      setRunChamp(winnerId);
      setRunDefenses(1);
      if (used >= EXHIBITION_CAP) {
        setRunOver({ outcome: "undefeated", champId: winnerId, defenses: 1 });
      } else {
        nextBout(winnerId, next);
      }
    } else if (winnerId === runChamp) {
      const defenses = runDefenses + 1;
      setRunDefenses(defenses);
      if (used >= EXHIBITION_CAP) {
        setRunOver({ outcome: "undefeated", champId: runChamp, defenses });
      } else {
        nextBout(runChamp, next);
      }
    } else {
      // The champion falls — the run is over. (The vote for the challenger is
      // real signal either way; the loss is the run's natural session end.)
      setRunOver({ outcome: "dethroned", champId: runChamp, defenses: runDefenses, conquerorId: winnerId });
    }
  }

  // Walk away mid-run: the champion retires with its wins.
  function endRun() {
    if (runChamp == null) {
      // Nothing crowned yet — just leave exhibition quietly.
      setExhibition(false);
      setView("done");
      return;
    }
    setRunOver({ outcome: "retired", champId: runChamp, defenses: runDefenses });
  }

  // From the run-over card: keep playing with the conqueror as the new king.
  function continueRun(newChampId: number) {
    setRunOver(null);
    setRunChamp(newChampId);
    setRunDefenses(1); // it just won its crowning bout
    nextBout(newChampId);
  }

  function exitExhibition() {
    setExhibition(false);
    setRunOver(null);
    setView("done");
  }

  // Share the run's story — same native-share / clipboard pattern as shareCalls.
  function shareExhibition() {
    if (!runOver) return;
    const champName = byId.get(runOver.champId)?.name ?? "My champion";
    const conqueror = runOver.conquerorId != null ? byId.get(runOver.conquerorId)?.name : null;
    const text =
      runOver.outcome === "dethroned"
        ? `⚔️ Exhibition run on Coliseo: ${champName} outlasted ${runOver.defenses} challenger${runOver.defenses === 1 ? "" : "s"} before falling to ${conqueror}.`
        : runOver.outcome === "undefeated"
          ? `👑 ${champName} went ${runOver.defenses}-0 in Coliseo exhibition bouts — retired undefeated.`
          : `🏁 ${champName} retired with ${runOver.defenses} exhibition win${runOver.defenses === 1 ? "" : "s"} on Coliseo.`;
    const url = "https://convictionelo.vercel.app";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: "Coliseo", text, url }).catch(() => {});
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(`${text}\n${url}`).then(
        () => {
          setShareMsg("Copied — paste it anywhere");
          setTimeout(() => setShareMsg(null), 2400);
        },
        () => setShareMsg("Couldn’t copy automatically"),
      );
    }
  }

  function simDay() {
    // Missed day (set unfinished) decays one tier; otherwise a clean new day.
    if (pickIndex < 3) {
      setStreak((s) => {
        const decayed = decayedStreak(s);
        if (userId) void saveStreak(userId, decayed); // persist the decay
        return decayed;
      });
    }
    setPickIndex(0);
    setTodaysPicks([]);
    setDoneToday(false); // new day — re-lock the tables until 3 picks are done
    setExhibition(false); // exhibition resets with the day
    setExhibitionUsed(0);
    setRunChamp(null);
    setRunDefenses(0);
    setRunOver(null);
    newMatch(); // fresh gauntlet: two comparable companies on the day's question
    setView("vote");
  }

  // Share today's three calls. Uses the native share sheet where available
  // (mobile), and falls back to copying a text summary to the clipboard on
  // desktop. This is the seed of the dynamic share-image / OG-card growth loop.
  function shareCalls() {
    const lines = todaysPicks
      .map((p) => `${QUESTIONS[p.q].label}: ${p.win} > ${p.lose}`)
      .join("\n");
    const text = `My Coliseo calls today\n${lines}\n🔥 ${streak}-day streak`;
    const url = "https://convictionelo.vercel.app";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: "Coliseo", text, url }).catch(() => {});
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(`${text}\n${url}`).then(
        () => {
          setShareMsg("Copied — paste it anywhere");
          setTimeout(() => setShareMsg(null), 2400);
        },
        () => setShareMsg("Couldn’t copy automatically"),
      );
    }
  }

  // Close the first-run explainer and remember it, so it never shows again on
  // this browser.
  function dismissOnboard() {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* no-op */
    }
    setShowOnboard(false);
  }

  // Auto-fill the Submit form from the company's own website (see
  // app/api/enrich/route.ts). Best-effort: fills name/blurb/logo as editable
  // suggestions; the user can correct anything before submitting.
  async function enrichFromUrl() {
    const url = form.url.trim();
    if (!url) return;
    setEnrich({ state: "loading", msg: "Reading the site…" });
    try {
      const res = await fetch(`/api/enrich?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error && !data.name) {
        setEnrich({ state: "err", msg: "Couldn’t read that site — fill it in manually." });
        return;
      }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        blurb: data.description || f.blurb,
        logoUrl: data.logo || f.logoUrl,
      }));
      if (!data.name && !data.description) {
        // Some sites (JS-rendered SPAs) publish no readable tags.
        setEnrich({ state: "err", msg: "This site didn’t share much — please fill in the details." });
      } else {
        setEnrich({ state: "ok", msg: "Filled from the site — check and edit as needed." });
      }
    } catch {
      setEnrich({ state: "err", msg: "Couldn’t read that site — fill it in manually." });
    }
  }

  // Submit a company for review. Persists via the server-authoritative
  // submit_company RPC — the company lands as status='pending' and enters the
  // arena only once an admin approves it (moderation is done in the Supabase
  // dashboard for now; there's no in-app admin role yet). With no backend
  // configured (local demo) we fall back to an optimistic local add so the flow
  // still works offline.
  async function handleSubmitCompany() {
    const name = form.name.trim();
    if (!name) {
      setSubmitState({ state: "err", msg: "A company name is required." });
      return;
    }
    const website = form.url.trim().replace(/^https?:\/\//, "").replace(/\/.*/, "");
    if (!website) {
      setSubmitState({ state: "err", msg: "A company website is required." });
      return;
    }

    setSubmitState({ state: "loading", msg: "Submitting…" });
    const outcome = await submitCompany({
      name,
      website,
      category: form.cat,
      region: form.reg,
      blurb: form.blurb.trim() || undefined,
      logoUrl: form.logoUrl || undefined,
    });

    if (outcome.ok) {
      setSubmitState({
        state: "ok",
        msg: `“${name}” submitted for review — it’ll enter the arena once approved.`,
      });
      setForm({ url: "", name: "", cat: "AI", reg: "US", blurb: "", logoUrl: "" });
      setEnrich({ state: "idle", msg: "" });
      return;
    }

    if (outcome.noBackend) {
      // Local demo (no Supabase): add optimistically so the flow is visible.
      // Not persisted anywhere — resets on refresh.
      const id = Math.max(0, ...companies.map((c) => c.id)) + 1;
      const grad = "linear-gradient(135deg,#0eb6a6,#37b6ff)";
      const r = () => ({ elo: 1500, games: 0, weekMovement: 0, seasonStart: 1500 });
      setCompanies([
        ...companies,
        {
          id,
          name,
          website,
          category: form.cat,
          region: form.reg,
          stage: "Growth",
          blurb: form.blurb.trim() || "Freshly submitted — awaiting details.",
          gradient: grad,
          ratings: { V: r(), G: r(), D: r() },
          prominence: 2,
          logoUrl: form.logoUrl || null,
        },
      ]);
      setForm({ url: "", name: "", cat: "AI", reg: "US", blurb: "", logoUrl: "" });
      setEnrich({ state: "idle", msg: "" });
      setSubmitState({
        state: "ok",
        msg: `“${name}” added locally — demo mode, no backend configured.`,
      });
      return;
    }

    setSubmitState({
      state: "err",
      msg: outcome.error || "Something went wrong — please try again.",
    });
  }

  // Rankings are computed over active companies only — graduates don't hold a rank.
  const ranked = useMemo(
    () => (qk: BoardQ) => [...activeCompanies].sort((x, y) => eloOf(y, qk) - eloOf(x, qk)),
    [activeCompanies],
  );
  const rankOf = (id: number, qk: BoardQ) => ranked(qk).findIndex((c) => c.id === id) + 1;

  // The rows shown in the Tables: ranked by the chosen dimension, then narrowed
  // by the active filters (category AND region AND stage). Rank shown is the
  // position within the current view, so a filtered table reads "#1 in Fintech".
  const activeFilterCount =
    (catFilter !== "All" ? 1 : 0) + (regFilter !== "All" ? 1 : 0) + (stageFilter !== "All" ? 1 : 0);
  const tableRows = useMemo(
    () =>
      ranked(boardQ).filter(
        (c) =>
          (catFilter === "All" || c.category === catFilter) &&
          (regFilter === "All" || c.region === regFilter) &&
          (stageFilter === "All" || c.stage === stageFilter),
      ),
    [ranked, boardQ, catFilter, regFilter, stageFilter],
  );
  const lockedPreviewRows = useMemo(() => ranked("ALL").slice(0, 5), [ranked]);

  // ---------- render helpers ----------
  function cardFact(c: Company) {
    if (c.totalFunding) return `Raised ${c.totalFunding}`;
    if (c.foundedYear) return `Founded ${c.foundedYear}`;
    if (c.headquarters) return `HQ ${c.headquarters}`;
    if (c.employees) return `${c.employees} people`;
    return `${c.stage}-stage ${c.category}`;
  }

  function pickInsight() {
    if (!decided || !A || !B) return null;
    const winner = decided.winSide === "A" ? A : B;
    const loser = decided.winSide === "A" ? B : A;
    const winnerDelta = decided.winSide === "A" ? decided.dA : decided.dB;
    const winChance = Math.round(expected(winner, loser, voteQ) * 100);
    const title =
      winChance >= 65
        ? "Consensus call"
        : winChance <= 35
          ? "Contrarian call"
          : "Close call";
    const detail =
      winChance >= 65
        ? `The rating model already leaned ${winner.name}, and your pick nudges it further.`
        : winChance <= 35
          ? `The rating model gave ${winner.name} only ${winChance}% odds here. That's the spicy call.`
          : "The rating model had this almost even, so this is exactly the kind of vote that moves the table.";
    return {
      title,
      detail,
      meta: `${winner.name} over ${loser.name} · ${winnerDelta >= 0 ? "+" : ""}${winnerDelta} ${QUESTIONS[voteQ].label} Elo`,
    };
  }

  // The full company dossier body, shared by the Profile view and the vote-flow
  // peek sheet so both stay in sync. Caller supplies the surrounding chrome
  // (the .dossier card, a back button / a close button, etc.).
  const DossierBody = ({ c }: { c: Company }) => {
    const games = c.ratings.V.games + c.ratings.G.games + c.ratings.D.games;
    const facts: [string, string | undefined][] = [
      ["Founded", c.foundedYear ? String(c.foundedYear) : undefined],
      ["Headquarters", c.headquarters],
      ["Team size", c.employees],
      ["Total funding", c.totalFunding],
      ["Valuation", c.valuation],
      ["Stage", `${c.stage}-stage`],
    ];
    const shownFacts = facts.filter(([, v]) => v);
    return (
      <>
        <div className="profile-head">
          <Logo c={c} cls="em-lg" />
          <div className="profile-id">
            <h2 className="sec" style={{ margin: 0 }}>
              {c.name}
            </h2>
            <div className="cat">
              {c.category} · {c.region} · {c.stage}-stage
            </div>
            <a className="weblink" href={webHref(c.website)} target="_blank" rel="noreferrer">
              {webDomain(c.website)} ↗
            </a>
          </div>
        </div>

        {!isActive(c) && (
          <div className="grad-banner">
            🎓 Graduated{c.exitNote ? ` — ${c.exitNote}` : ""}. No longer in the arena; final
            rating shown below.
          </div>
        )}

        {c.tags && c.tags.length > 0 && (
          <div className="profile-tags">
            {c.tags.map((t) => (
              <span key={t} className="ptag">
                {t}
              </span>
            ))}
          </div>
        )}

        {(c.description || c.blurb) && <p className="profile-desc">{c.description || c.blurb}</p>}

        {shownFacts.length > 0 && (
          <div className="facts">
            {shownFacts.map(([label, val]) => (
              <div className="fact" key={label}>
                <div className="fact-l">{label}</div>
                <div className="fact-v">{val}</div>
              </div>
            ))}
          </div>
        )}

        {c.founders && c.founders.length > 0 && (
          <div className="fact founders">
            <div className="fact-l">Founder{c.founders.length > 1 ? "s" : ""}</div>
            <div className="fact-v">{c.founders.join(" · ")}</div>
          </div>
        )}

        <div className="dossier-sub">📊 Coliseo ratings</div>
        <div className="vr">
          <span className="q">🏆 Overall {isActive(c) ? "rank" : "(final)"}</span>
          <span className="p">
            {isActive(c) ? `#${rankOf(c.id, "ALL")} · ` : ""}
            {composite(c)} Elo
          </span>
        </div>
        <div className="rating-cards">
          {(["V", "G", "D"] as QKey[]).map((q) => (
            <div className="rcard" key={q}>
              <div className="rc-elo">{c.ratings[q].elo}</div>
              <div className="rc-rank">{isActive(c) ? `#${rankOf(c.id, q)}` : "—"}</div>
              <div className="cat">
                {QUESTIONS[q].emoji} {QUESTIONS[q].label}
              </div>
              <div className={`rc-conf ${confidence(c, q) === "Established" ? "est" : "prov"}`}>
                {confidence(c, q)}
              </div>
            </div>
          ))}
        </div>
        <div className="vr">
          <span className="q">Total matchups</span>
          <span className="p">{games}</span>
        </div>

        <div className="links-row">
          <a href={webHref(c.website)} target="_blank" rel="noreferrer" className="linkbtn">
            🌐 Website
          </a>
          {c.links?.x && (
            <a href={c.links.x} target="_blank" rel="noreferrer" className="linkbtn">
              𝕏 X
            </a>
          )}
          {c.links?.linkedin && (
            <a href={c.links.linkedin} target="_blank" rel="noreferrer" className="linkbtn">
              in LinkedIn
            </a>
          )}
          {c.links?.crunchbase && (
            <a href={c.links.crunchbase} target="_blank" rel="noreferrer" className="linkbtn">
              ◆ Crunchbase
            </a>
          )}
        </div>

        <button
          className="skip suggest-edit"
          onClick={() =>
            alert(
              "Suggest-an-edit is coming soon — it will create a pending revision reviewed wiki-style.",
            )
          }
        >
          ✏️ Suggest an edit
        </button>
      </>
    );
  };

  const Fighter = ({ c, side }: { c: Company; side: "A" | "B" }) => {
    const selected = decided && decided.winSide === side;
    const delta = decided ? (side === "A" ? decided.dA : decided.dB) : 0;
    const previewElo = decided ? (side === "A" ? decided.eloA : decided.eloB) : c.ratings[voteQ].elo;
    const fact = cardFact(c);
    return (
      <div
        className={`fighter${selected ? " win" : ""}`}
        onClick={() => selectSide(side)}
        role="button"
        aria-pressed={!!selected}
      >
        <Logo c={c} cls="emoji" />
        <div className="f-info">
          <div className="nm">{c.name}</div>
          <div className="cat">
            {c.category} · {c.region} · {c.stage}
          </div>
          <div className="factline">{fact}</div>
          <div className="blurb">{c.blurb}</div>
          <button
            type="button"
            className="peek-tag"
            title={`Learn more about ${c.name}`}
            aria-label={`Learn more about ${c.name}`}
            onClick={(e) => {
              e.stopPropagation(); // don't cast a vote — just open the dossier
              setPeekId(c.id);
            }}
          >
            ⓘ <span>learn more</span>
          </button>
        </div>
        {decided && (
          <div className="f-score">
            <div className="elo">
              {QUESTIONS[voteQ].emoji} {previewElo}
            </div>
            <div className={`delta ${delta >= 0 ? "up" : "down"}`}>
              {delta >= 0 ? "▲ +" : "▼ "}
              {delta}
            </div>
          </div>
        )}
        {/* One plain-language escape hatch per card (feeds the obscurity
            signal), replacing the old "🤷 not familiar" corner tag that beta
            testers didn't understand. Hidden once a side is selected, and on
            the reigning exhibition champion (the player's own pick). */}
        {!decided && !(exhibition && c.id === runChamp) && (
          <button
            type="button"
            className="swap-link"
            title={`I don't know ${c.name} — swap in another company`}
            onClick={(e) => {
              e.stopPropagation();
              markUnknown(c);
            }}
          >
            🤷 Don&apos;t know {c.name}? <span>Swap them out</span>
          </button>
        )}
        {/* The advance action lives INSIDE the card the user just picked — the
            eye is already there, so mobile users no longer hunt for a separate
            "Lock it in" button below the fold. */}
        {selected && (
          <button
            type="button"
            className="advance-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (exhibition) commitExhibition();
              else commitPick();
            }}
          >
            {exhibition
              ? runChamp == null
                ? `✓ Crown ${c.name} — start the run →`
                : c.id === runChamp
                  ? "✓ Defend the crown — next bout →"
                  : "⚔️ Dethrone the champion"
              : pickIndex >= 2
                ? "Lock it in — see today’s results →"
                : `✓ Advance to Round ${pickIndex + 2} →`}
          </button>
        )}
      </div>
    );
  };

  if (companies.length === 0 || !A || !B) {
    return (
      <div className="wrap">
        <p className="note">Loading companies…</p>
      </div>
    );
  }

  // Rails flank the focused vote/done column on desktop only; other views keep
  // the plain centered layout (Tables widens itself instead — see .wrap-wide).
  const railsOn = view === "vote" || view === "done";

  return (
    <div className={"shell" + (railsOn ? " shell-rails" : "")}>
      {railsOn && (
        <aside className="shell-sidebar" aria-label="Your day and discovery">
          <div className="rail-card">
            <div className="rail-h">Your day</div>
            <div className="rail-streak">🔥 {streak} day streak</div>
            <span className="rail-tier" style={{ background: tier.color }}>
              {tier.name}
            </span>
            <div className="rail-row">
              <span>Picks made today</span>
              <b>{Math.min(pickIndex, 3)} / 3</b>
            </div>
            <div className="rail-row">
              <span>Vote weight</span>
              <b>×{tier.mult.toFixed(2)}</b>
            </div>
            <button className="rail-link" onClick={() => setShowOnboard(true)}>
              ⓘ How it works
            </button>
            <button className="rail-link" onClick={() => setShowScoring(true)}>
              📊 How scoring works
            </button>
          </div>
          <div className="rail-card">
            <div className="rail-h">Discover</div>
            <div className="rail-stats">
              <div>
                <b>{companies.length}</b>
                <span>startups</span>
              </div>
              <div>
                <b>{CATEGORIES.length}</b>
                <span>categories</span>
              </div>
              <div>
                <b>{REGIONS.length}</b>
                <span>regions</span>
              </div>
            </div>
            <div className="rail-sub">Just added</div>
            <div className="rail-recent">
              {recentlyAdded.map((c) => (
                <button key={c.id} className="rail-co" onClick={() => setPeekId(c.id)}>
                  <Logo c={c} cls="rail-logo" />
                  <span className="rail-co-txt">
                    <b>{c.name}</b>
                    <small>
                      {c.category} · {c.region}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <button className="rail-cta" onClick={() => setView("submit")}>
              ➕ Submit a startup
            </button>
          </div>
        </aside>
      )}
      <div className={"wrap" + (view === "board" ? " wrap-wide" : "")}>
        <header className="top">
        <div className="brand">
          <div className="logo">
            <img className="brand-mark" src="/coliseo-mark.svg" alt="" /> Coliseo
          </div>
          <div className="tagline">Head-to-Head Startup Ranking &amp; Discovery</div>
        </div>
        <div className="cred">
          <div className="tier" style={{ background: tier.color }}>
            {tier.name}
          </div>
          <div className="badge">🔥 {streak}</div>
        </div>
      </header>

      <div className="daily">
        <div className="dl">
          <div className="dots">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`dot${i < pickIndex || (i === pickIndex && decided) ? " done" : ""}`}
              />
            ))}
          </div>
          <div className="txt">
            <b>{Math.max(0, 3 - pickIndex - (decided ? 1 : 0))}</b> picks left today · vote weight{" "}
            <b>×{tier.mult.toFixed(2)}</b>
          </div>
        </div>
        {process.env.NODE_ENV !== "production" && (
          <button className="simday" onClick={simDay}>
            ▶ new day
          </button>
        )}
      </div>

      {/* VOTE — locked once today's 3 picks are used (see doneToday). The
          matchup is only rendered when there are picks left, so a finished user
          structurally cannot cast a 4th; the popup explains why. */}
      {view === "vote" && doneToday && !exhibition && (
        <section className="done-card">
          <div className="big">✅</div>
          <h2>That&apos;s your 3 for today</h2>
          <p>
            Today&apos;s three arena picks are in — your streak is safe, and a fresh question lands
            tomorrow.
            {exhibitionUsed < EXHIBITION_CAP &&
              " Still got takes? Exhibition bouts count at ¼ weight and don't touch your daily 3."}
          </p>
          {exhibitionUsed < EXHIBITION_CAP && (
            <button className="nextbtn" onClick={() => startExhibition()} style={{ marginTop: 10 }}>
              ⚔️ Keep playing — exhibition bouts →
            </button>
          )}
          <button
            className={exhibitionUsed < EXHIBITION_CAP ? "sharebtn" : "nextbtn"}
            onClick={() => setView("board")}
            style={{ marginTop: 10 }}
          >
            🏆 See the leaderboard →
          </button>
        </section>
      )}
      {view === "vote" && (!doneToday || (exhibition && !runOver)) && (
        <section className="run">
          {/* Trail: each completed round collapses into a breadcrumb, and the
              live matchup renders below it — so the day reads as one continuous
              downward journey through the 3 rounds rather than resetting up top. */}
          {todaysPicks.length > 0 && (
            <div className="trail">
              {todaysPicks.map((p, i) => (
                <div className="tnode" key={i}>
                  <span className="tdot" aria-hidden="true">✓</span>
                  <div className="tcard">
                    <span className="tk">
                      Round {i + 1} · {QUESTIONS[p.q].label}
                    </span>
                    <span className="tpick">
                      <b>{p.win}</b> <span className="tover">over</span> {p.lose}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="step" ref={activeStepRef}>
          <div className="qbar">
            <div className="k">
              {exhibition
                ? `Exhibition · ¼ weight · ${Math.max(0, EXHIBITION_CAP - exhibitionUsed)} bout${EXHIBITION_CAP - exhibitionUsed === 1 ? "" : "s"} left today`
                : `Pick ${Math.min(pickIndex, 2) + 1} of 3 · ${QUESTIONS[voteQ].label}`}
            </div>
            <h1 dangerouslySetInnerHTML={{ __html: QUESTIONS[voteQ].q }} />
            {exhibition && runChamp != null && (
              <p className="exh-status">
                👑 <b>{byId.get(runChamp)?.name}</b> has held the crown for {runDefenses} bout
                {runDefenses === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <div className="arena">
            <Fighter c={A} side="A" />
            <div className="vs">
              <div className="orb">VS</div>
            </div>
            <Fighter c={B} side="B" />
          </div>
          {!decided && (
            <button className="skip" onClick={() => reshuffle(a)}>
              🤔 Too close to call — swap in a new challenger
            </button>
          )}
          {exhibition && !decided && (
            <button className="skip" onClick={endRun}>
              🏁 End the run{runChamp != null ? ` — ${byId.get(runChamp)?.name} retires` : ""}
            </button>
          )}
          {decided && (
            <>
              <div className="result-card">
                <div className="result-kicker">{QUESTIONS[voteQ].chip}</div>
                <div className="result-title">
                {(() => {
                  const w = decided.winSide === "A" ? A : B;
                  const l = decided.winSide === "A" ? B : A;
                  const pct = Math.round(expected(w, l, voteQ) * 100);
                  return pct >= 70
                    ? `Backing the favourite — ${w.name}`
                    : pct <= 35
                      ? `🚨 Upset! You backed the underdog ${w.name}`
                      : `Line-ball call — you're giving it to ${w.name}`;
                })()}
                </div>
                {(() => {
                  const insight = pickInsight();
                  if (!insight) return null;
                  return (
                    <>
                      <div className="result-meta">{insight.meta}</div>
                      <p>{insight.detail}</p>
                    </>
                  );
                })()}
              </div>
              <button className="skip" onClick={() => setDecided(null)}>
                ↩ tap the other card to switch, or clear your selection
              </button>
            </>
          )}
          <p className="note">
            {anonDisabled
              ? "⚠ Anonymous sign-ins are disabled in Supabase — votes aren’t being recorded yet. Enable them in Authentication → Sign In / Providers."
              : `Votes are recorded to your pseudonymous profile · ranking the Arena ${companies.length}`}
          </p>
          </div>
        </section>
      )}

      {/* EXHIBITION RUN OVER — the run's story: dethroned (the natural session
          end), retired undefeated at the cap, or walked away. */}
      {view === "vote" &&
        exhibition &&
        runOver &&
        (() => {
          const champ = byId.get(runOver.champId);
          const conqueror = runOver.conquerorId != null ? byId.get(runOver.conquerorId) : undefined;
          const n = runOver.defenses;
          return (
            <section className="done-card">
              <div className="big">
                {runOver.outcome === "dethroned" ? "⚔️" : runOver.outcome === "undefeated" ? "👑" : "🏁"}
              </div>
              <h2>
                {runOver.outcome === "dethroned"
                  ? `${conqueror?.name ?? "A challenger"} takes the crown`
                  : runOver.outcome === "undefeated"
                    ? `${champ?.name} retires undefeated`
                    : `${champ?.name} retires`}
              </h2>
              <p>
                {runOver.outcome === "dethroned"
                  ? n === 0
                    ? `${champ?.name} fell in the opening bout. Brutal arena out there.`
                    : `${champ?.name} outlasted ${n} challenger${n === 1 ? "" : "s"} before falling.`
                  : runOver.outcome === "undefeated"
                    ? `${n} straight win${n === 1 ? "" : "s"} — that's today's exhibition cap. A fresh run unlocks tomorrow.`
                    : `${n} exhibition win${n === 1 ? "" : "s"} banked.`}{" "}
                Every bout moved the ratings at ¼ weight.
              </p>
              <button className="nextbtn" onClick={shareExhibition} style={{ marginTop: 10 }}>
                ↗ Share the run
              </button>
              {runOver.outcome === "dethroned" && exhibitionUsed < EXHIBITION_CAP && conqueror && (
                <button className="sharebtn" onClick={() => continueRun(conqueror.id)}>
                  ⚔️ New run — {conqueror.name} defends the crown →
                </button>
              )}
              <button className="sharebtn" onClick={exitExhibition}>
                ← Back to today&apos;s results
              </button>
              <p className="done-note" aria-live="polite">
                {shareMsg ?? ""}
              </p>
            </section>
          );
        })()}

      {/* DONE — a champion-centric card built as a screenshot-ready share object
          (the visual blueprint for the future dynamic OG / social image). The
          day's gauntlet crowns one company; the card tells that story. */}
      {view === "done" &&
        (() => {
          const last = todaysPicks[todaysPicks.length - 1];
          const champId = last?.winId;
          const champ = champId != null ? byId.get(champId) : undefined;
          const champName = last?.win ?? "";
          const dimLabel = todaysPicks.length ? QUESTIONS[todaysPicks[0].q].label : "";
          const dateStr = new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          // Everyone who stepped into the arena today except the champion, in the
          // order they first appeared — the field the champion outlasted.
          const seen = new Set<number>();
          const outlasted: { id: number; name: string }[] = [];
          for (const p of todaysPicks) {
            for (const [id, name] of [
              [p.winId, p.win],
              [p.loseId, p.lose],
            ] as [number, string][]) {
              if (id !== champId && !seen.has(id)) {
                seen.add(id);
                outlasted.push({ id, name });
              }
            }
          }
          return (
            <section className="done-wrap">
              <div className="done-eyebrow">🏆 Daily set complete</div>
              <div className="sharecard champ">
                <div className="sc-top">
                  <span className="sc-kicker">Today&apos;s gauntlet · {dimLabel}</span>
                  <span className="sc-date">{dateStr}</span>
                </div>
                <div className="sc-hero">
                  <div className="sc-crown" aria-hidden="true">
                    👑
                  </div>
                  {champ && <Logo c={champ} cls="sc-hero-logo" />}
                  <div className="sc-hero-name">{champName}</div>
                  <div className="sc-hero-sub">My pick — last one standing</div>
                </div>
                {outlasted.length > 0 && (
                  <div className="sc-beat">
                    <span className="sc-beat-label">Outlasted</span>
                    <div className="sc-beat-row">
                      {outlasted.map((c) => {
                        const co = byId.get(c.id);
                        return (
                          <span className="sc-chip" key={c.id}>
                            {co && <Logo c={co} cls="sc-clogo" />}
                            <span>{c.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="sc-foot">
                  <span className="sc-streak">
                    🔥 {streak}-day streak · {tier.name}
                  </span>
                  <span className="sc-brandmark">
                    <img className="sc-mark" src="/coliseo-mark.svg" alt="" /> Coliseo
                  </span>
                </div>
              </div>
              <button className="nextbtn" onClick={shareCalls} style={{ marginTop: 16 }}>
                ↗ Share my calls
              </button>
              {exhibitionUsed < EXHIBITION_CAP && (
                <button className="sharebtn exh-cta" onClick={() => startExhibition(champId ?? null)}>
                  ⚔️ {champName ? `${champName} still stands — ` : ""}enter the exhibition →
                </button>
              )}
              <button className="sharebtn" onClick={() => setView("board")}>
                🏆 See the leaderboard →
              </button>
              <p className="done-note" aria-live="polite">
                {shareMsg ??
                  "You’ve unlocked today’s tables. Come back tomorrow to keep the streak alive."}
              </p>
              {process.env.NODE_ENV !== "production" && (
                <button className="simday" onClick={simDay} style={{ marginTop: 4 }}>
                  ▶ Simulate tomorrow
                </button>
              )}
            </section>
          );
        })()}

      {/* BOARD */}
      {view === "board" && !doneToday && (
        <section className="locked">
          <div className="lock-emoji">🔒</div>
          <h2 className="sec">Today&apos;s tables are locked</h2>
          <p className="lock-p">
            Complete today&apos;s <b>3 calls</b> to unlock the Top 25, movers, and company profiles.
            <br />
            <span className="lock-prog">{Math.min(pickIndex, 3)} of 3 done today</span>
          </p>
          <div className="locked-preview" aria-hidden="true">
            <div className="preview-label">Today&apos;s leaderboard preview</div>
            <div className="preview-list">
              {lockedPreviewRows.map((c, i) => (
                <div key={c.id} className="row">
                  <div className={`rk ${i < 3 ? "top" : ""}`}>{i + 1}</div>
                  <Logo c={c} cls="em" />
                  <div className="info">
                    <div className="nm">{c.name}</div>
                    <div className="cat">
                      {c.category} · {c.region}
                    </div>
                  </div>
                  <div className="score">
                    <div className="val">{composite(c)}</div>
                    <div className="mv flat">locked</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="nextbtn" onClick={() => setView("vote")}>
            Answer today&apos;s picks →
          </button>
        </section>
      )}

      {view === "board" && doneToday && (
        <section>
          <div className="board-head">
            <h2 className="sec" style={{ margin: 0 }}>
              {showGrads ? "🎓 Graduates" : "🏆 The Tables"}
            </h2>
            <button className="simday" onClick={() => setShowGrads((g) => !g)}>
              {showGrads ? "← back to the arena" : `🎓 Graduates (${graduates.length})`}
            </button>
          </div>

          {showGrads ? (
            <>
              <p className="note" style={{ margin: "4px 0 12px", textAlign: "left" }}>
                Companies that left the arena — went public, were acquired, or shut down. They keep
                their profile and final rating, but no longer count in the rankings.
              </p>
              <div>
                {graduates.map((c) => (
                  <div
                    key={c.id}
                    className="row grad"
                    onClick={() => {
                      setProfileId(c.id);
                      setView("profile");
                    }}
                  >
                    <div className="rk">🎓</div>
                    <Logo c={c} cls="em" />
                    <div className="info">
                      <div className="nm">{c.name}</div>
                      <div className="cat">{c.exitNote ?? "Graduated"}</div>
                    </div>
                    <div className="score">
                      <div className="val">{composite(c)}</div>
                      <div className="mv flat">final</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="segwrap" id="ratingSeg">
                {(["ALL", "V", "G", "D"] as BoardQ[]).map((q) => (
                  <button key={q} className={boardQ === q ? "active" : ""} onClick={() => setBoardQ(q)}>
                    {q === "ALL" ? "🏆 Overall" : `${QUESTIONS[q].emoji} ${QUESTIONS[q].label}`}
                  </button>
                ))}
              </div>
              <div className="filterbar">
                <div className="filter-tags">
                  {activeFilterCount === 0 ? (
                    <span className="filter-none">🌍 All companies · Global</span>
                  ) : (
                    <>
                      {stageFilter !== "All" && (
                        <button className="fpill" onClick={() => setStageFilter("All")}>
                          {stageFilter}-stage <span aria-hidden>✕</span>
                        </button>
                      )}
                      {regFilter !== "All" && (
                        <button className="fpill" onClick={() => setRegFilter("All")}>
                          {regFilter} <span aria-hidden>✕</span>
                        </button>
                      )}
                      {catFilter !== "All" && (
                        <button className="fpill" onClick={() => setCatFilter("All")}>
                          {catFilter} <span aria-hidden>✕</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
                <button
                  className={`filter-btn ${activeFilterCount > 0 ? "on" : ""}`}
                  onClick={() => setShowFilters(true)}
                >
                  ⚙ Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
                </button>
              </div>
              <button className="scoring-link" onClick={() => setShowScoring(true)}>
                ⓘ How are these scored?
              </button>
              <div>
                {tableRows.length === 0 ? (
                  <p className="note" style={{ textAlign: "center", padding: "22px 0" }}>
                    No companies match these filters.{" "}
                    <button
                      className="linklike"
                      onClick={() => {
                        setCatFilter("All");
                        setRegFilter("All");
                        setStageFilter("All");
                      }}
                    >
                      Clear filters
                    </button>
                  </p>
                ) : (
                  tableRows.map((c, i) => {
                    const wk = boardQ === "ALL" ? compositeMovement(c) : c.ratings[boardQ].weekMovement;
                    const cls = wk > 0 ? "up" : wk < 0 ? "down" : "flat";
                    return (
                      <div
                        key={c.id}
                        className="row"
                        onClick={() => {
                          setProfileId(c.id);
                          setView("profile");
                        }}
                      >
                        <div className={`rk ${i < 3 ? "top" : ""}`}>{i + 1}</div>
                        <Logo c={c} cls="em" />
                        <div className="info">
                          <div className="nm">{c.name}</div>
                          <div className="cat">
                            {c.category} · {c.region}
                          </div>
                        </div>
                        <div className="score">
                          <div className="val">{eloOf(c, boardQ)}</div>
                          <div className={`mv ${cls}`}>
                            {wk > 0 ? `▲ ${wk}` : wk < 0 ? `▼ ${Math.abs(wk)}` : "—"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* PROFILE */}
      {view === "profile" && profileId !== null && byId.get(profileId) && (
        <section>
          <button className="skip" style={{ margin: "0 0 12px" }} onClick={() => setView("board")}>
            ← back to tables
          </button>
          <div className="dossier">
            <DossierBody c={byId.get(profileId)!} />
          </div>
        </section>
      )}

      {/* SUBMIT */}
      {view === "submit" && (
        <section>
          <h2 className="sec">
            ➕ Submit a startup <small>· get it into the arena</small>
          </h2>
          <div className="eligibility">
            <div className="elig-t">Who belongs in the arena</div>
            <ul>
              <li>
                <b>Private</b> — not publicly traded.
              </li>
              <li>
                <b>Venture-backed startup</b> — raised institutional venture funding; not a
                bootstrapped or family-owned private giant (e.g. Cargill).
              </li>
              <li>
                <b>Alive &amp; independent</b> — operating, not shut down or acquired.
              </li>
            </ul>
            <div className="elig-n">
              Companies that later IPO, get acquired, or shut down “graduate” — archived out of the
              rankings but kept in the Graduates list. Submissions are reviewed before going live.
            </div>
          </div>
          <div className="form">
            <label>Company website</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="https://acme.ai"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void enrichFromUrl();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="enrichbtn"
                onClick={() => void enrichFromUrl()}
                disabled={!form.url.trim() || enrich.state === "loading"}
              >
                {enrich.state === "loading" ? "…" : "✨ Auto-fill"}
              </button>
            </div>
            {enrich.state !== "idle" && (
              <div className={`enrich-status ${enrich.state}`}>
                {enrich.state === "loading" ? "⏳" : enrich.state === "ok" ? "✓" : "⚠"} {enrich.msg}
              </div>
            )}
            <p className="hint">
              Paste a URL and we’ll try to fill the name, pitch and logo from the site.
            </p>
            <label>
              Company name
              {form.logoUrl && (
                <img
                  src={form.logoUrl}
                  alt=""
                  className="logo-preview"
                  onLoad={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "";
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </label>
            <input
              placeholder="Acme"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Category</label>
                <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                  {CATEGORIES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Region</label>
                <select value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value })}>
                  {REGIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <label>One-line pitch</label>
            <textarea
              rows={2}
              placeholder="What do they do, in a sentence?"
              value={form.blurb}
              onChange={(e) => setForm({ ...form, blurb: e.target.value })}
            />
            <button
              className="submitbtn"
              onClick={() => void handleSubmitCompany()}
              disabled={submitState.state === "loading"}
            >
              {submitState.state === "loading" ? "Submitting…" : "Submit for review →"}
            </button>
            {submitState.state !== "idle" && submitState.state !== "loading" && (
              <div className={`enrich-status ${submitState.state}`}>
                {submitState.state === "ok" ? "✓" : "⚠"} {submitState.msg}
              </div>
            )}
          </div>
          <p className="note">
            Submissions are created as <b>pending</b> and reviewed before they enter the arena.
          </p>
        </section>
      )}

      {/* FILTER SHEET — the Tables' category / region / stage facets, tucked
          into a bottom sheet so the default board stays clean (Overall · All
          companies · Global). Filters are independent (AND) and apply live. */}
      {showFilters && (
        <div
          className="peek-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Filter the Tables"
          onClick={() => setShowFilters(false)}
        >
          <div className="peek-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="peek-grab" />
            <button className="peek-close" aria-label="Close" onClick={() => setShowFilters(false)}>
              ✕
            </button>
            <div className="peek-scroll filter-sheet">
              <div className="filter-sheet-head">
                <h3 className="sec" style={{ margin: 0 }}>
                  Filter the Tables
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    className="filter-reset"
                    onClick={() => {
                      setCatFilter("All");
                      setRegFilter("All");
                      setStageFilter("All");
                    }}
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="filter-group">
                <div className="filter-label">Stage</div>
                <div className="lbtabs">
                  {["All", ...STAGES].map((o) => (
                    <button
                      key={o}
                      className={`chip tab ${o === stageFilter ? "active" : ""}`}
                      onClick={() => setStageFilter(o)}
                    >
                      {o === "All" ? "All stages" : o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <div className="filter-label">Region</div>
                <div className="lbtabs">
                  {["All", ...REGIONS].map((o) => (
                    <button
                      key={o}
                      className={`chip tab ${o === regFilter ? "active" : ""}`}
                      onClick={() => setRegFilter(o)}
                    >
                      {o === "All" ? "🌍 Global" : o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <div className="filter-label">Category</div>
                <div className="lbtabs">
                  {["All", ...CATEGORIES].map((o) => (
                    <button
                      key={o}
                      className={`chip tab ${o === catFilter ? "active" : ""}`}
                      onClick={() => setCatFilter(o)}
                    >
                      {o === "All" ? "All companies" : o}
                    </button>
                  ))}
                </div>
              </div>

              <button className="submitbtn filter-done" onClick={() => setShowFilters(false)}>
                Show {tableRows.length} result{tableRows.length === 1 ? "" : "s"} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PEEK — read-only dossier for a company you don't recognise, shown as a
          bottom sheet over the vote flow. Closing it returns you to the exact
          same matchup; no vote is cast. */}
      {/* FIRST-RUN ONBOARDING — a one-time, dismissible explainer of the whole
          loop, shown on a visitor's first ever load. Kept deliberately short:
          comprehension in the first few seconds is what earns a second visit. */}
      {showOnboard && (
        <div
          className="onboard-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboard-title"
          onClick={dismissOnboard}
        >
          <div className="onboard-card" onClick={(e) => e.stopPropagation()}>
            <div className="onboard-eyebrow">Welcome</div>
            <h2 id="onboard-title" className="onboard-title">
              Rank startups <span>head-to-head</span>
            </h2>
            <p className="onboard-sub">A 30-second daily game. Here&apos;s the whole thing:</p>
            <ol className="onboard-steps">
              <li>
                <span className="onboard-ic">⚔️</span>
                <span>
                  <b>Back a winner.</b> Two startups face off — tap the one you believe in (not just the
                  one you&apos;ve heard of).
                </span>
              </li>
              <li>
                <span className="onboard-ic">🔥</span>
                <span>
                  <b>King of the hill.</b> Your pick stays on and takes on a fresh challenger — three
                  quick rounds a day.
                </span>
              </li>
              <li>
                <span className="onboard-ic">📊</span>
                <span>
                  <b>One question a day, rotating:</b> 💰 which you&apos;d put your entire net worth
                  into, 🔥 which is winning right now, or 🧲 which pulls in the killer talent. Every
                  vote moves a live rating; finish your three to unlock the leaderboard.
                </span>
              </li>
            </ol>
            <button className="nextbtn onboard-cta" onClick={dismissOnboard}>
              Start voting →
            </button>
            <p className="onboard-fine">No signup, no name — you&apos;re anonymous.</p>
          </div>
        </div>
      )}
      {/* DAILY-LIMIT POPUP — the "you can't answer more than 3 a day" notice.
          The vote area is already locked when doneToday; this explains it. */}
      {showLimitModal && (
        <div
          className="onboard-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="limit-title"
          onClick={() => setShowLimitModal(false)}
        >
          <div className="onboard-card" onClick={(e) => e.stopPropagation()}>
            <div className="onboard-eyebrow">Daily limit</div>
            <h2 id="limit-title" className="onboard-title">
              That&apos;s your <span>3 for today</span>
            </h2>
            <p className="onboard-sub">
              Three arena rounds a day, then a fresh question tomorrow — scarcity is what makes each
              pick count (and keeps your streak alive).
              {exhibitionUsed < EXHIBITION_CAP &&
                " Still got takes? Exhibition bouts count at ¼ weight and never touch your daily 3."}
            </p>
            {exhibitionUsed < EXHIBITION_CAP && (
              <button
                className="nextbtn onboard-cta"
                onClick={() => {
                  setShowLimitModal(false);
                  startExhibition();
                }}
              >
                ⚔️ Keep playing — exhibition bouts →
              </button>
            )}
            <button
              className={exhibitionUsed < EXHIBITION_CAP ? "sharebtn" : "nextbtn onboard-cta"}
              style={exhibitionUsed < EXHIBITION_CAP ? { margin: "10px auto 0" } : undefined}
              onClick={() => {
                setShowLimitModal(false);
                setView("board");
              }}
            >
              See today&apos;s leaderboard →
            </button>
            <button className="linklike" style={{ display: "block", margin: "12px auto 0" }} onClick={() => setShowLimitModal(false)}>
              Maybe later
            </button>
          </div>
        </div>
      )}
      {/* HOW SCORING WORKS — a plain-language Elo explainer, opened from the
          leaderboard (where the numbers are) and the sidebar. */}
      {showScoring && (
        <div
          className="onboard-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scoring-title"
          onClick={() => setShowScoring(false)}
        >
          <div className="onboard-card scoring-card" onClick={(e) => e.stopPropagation()}>
            <div className="onboard-eyebrow">The ratings</div>
            <h2 id="scoring-title" className="onboard-title">
              How the <span>scoring</span> works
            </h2>
            <p className="onboard-sub">
              Every company carries a live rating in each dimension. It&apos;s an <b>Elo</b> rating —
              the same system that ranks chess players and tennis pros.
            </p>
            <ol className="onboard-steps">
              <li>
                <span className="onboard-ic">🥇</span>
                <span>
                  <b>Everyone starts at 1500.</b> Win a head-to-head and your rating rises; lose and it
                  falls.
                </span>
              </li>
              <li>
                <span className="onboard-ic">🎯</span>
                <span>
                  <b>Upsets count for more.</b> Beating a favourite moves the needle far more than
                  beating an underdog.
                </span>
              </li>
              <li>
                <span className="onboard-ic">🌱</span>
                <span>
                  <b>New companies are Provisional</b> — their rating swings fast until they&apos;ve had
                  enough votes, then it settles.
                </span>
              </li>
              <li>
                <span className="onboard-ic">🔥</span>
                <span>
                  <b>Stronger voters carry more weight.</b> A longer daily streak lifts your credibility
                  tier, so your picks nudge ratings a little harder.
                </span>
              </li>
              <li>
                <span className="onboard-ic">⚔️</span>
                <span>
                  <b>Exhibition bouts count at ¼ weight.</b> Your daily 3 arena picks carry your full
                  weight; the optional exhibition run after them moves ratings gently.
                </span>
              </li>
              <li>
                <span className="onboard-ic">📊</span>
                <span>
                  <b>Three independent scores</b> — Conviction, Momentum, and Talent — so a company can
                  lead on one and trail on another.
                </span>
              </li>
            </ol>
            <button className="nextbtn onboard-cta" onClick={() => setShowScoring(false)}>
              Got it
            </button>
            <p className="onboard-fine">
              It&apos;s all open source —{" "}
              <a
                className="footer-name"
                href="https://github.com/mancunianinnyc/coliseo/blob/main/METHODOLOGY.md"
                target="_blank"
                rel="noreferrer"
              >
                read the full methodology
              </a>
              .
            </p>
          </div>
        </div>
      )}
      {peekId !== null && byId.get(peekId) && (
        <div
          className="peek-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`About ${byId.get(peekId)!.name}`}
          onClick={() => setPeekId(null)}
        >
          <div className="peek-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="peek-grab" />
            <button className="peek-close" aria-label="Close" onClick={() => setPeekId(null)}>
              ✕
            </button>
            <div className="peek-scroll">
              <div className="peek-eyebrow">ⓘ Learning about — you haven&apos;t voted</div>
              <div className="dossier peek-dossier">
                <DossierBody c={byId.get(peekId)!} />
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <p className="footer-legal">
          Crowd opinions — not facts, financial advice, or endorsement.{" "}
          <a className="footer-why" href="/legal">
            Why &amp; how it works →
          </a>
        </p>
        <div className="footer-meta">
          <span>
            Vibecoded for fun by{" "}
            <a className="footer-name" href="https://www.rossgarlick.com" target="_blank" rel="noreferrer">
              Ross Garlick
            </a>{" "}
            and contributors
          </span>
          <span className="footer-dot" aria-hidden="true">
            ·
          </span>
          <a
            className="gh-link"
            href="https://github.com/mancunianinnyc/coliseo"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Contribute to Coliseo
          </a>
        </div>
        <a className="footer-legal-link" href="/legal">
          Privacy &amp; Terms
        </a>
      </footer>

      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <linearGradient id="navGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0eb6a6" />
          <stop offset="1" stopColor="#37b6ff" />
        </linearGradient>
      </svg>
      <nav className="bottom">
        <div className="nav-inner">
          <button
            className={view === "vote" || view === "done" ? "active" : ""}
            onClick={() => setView("vote")}
          >
            <span className="ic">
              <NavIcon name="vote" />
            </span>
            Vote
          </button>
          <button
            className={view === "board" || view === "profile" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <span className="ic">
              <NavIcon name={doneToday ? "tables" : "locked"} />
            </span>
            Tables
          </button>
          <button
            className={view === "submit" ? "active" : ""}
            onClick={() => setView("submit")}
          >
            <span className="ic">
              <NavIcon name="submit" />
            </span>
            Submit
          </button>
        </div>
      </nav>
      </div>
    </div>
  );
}

