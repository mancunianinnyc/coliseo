"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company, QKey } from "@/lib/types";
import { QUESTIONS, QORDER } from "@/lib/questions";
import { loadCompanies } from "@/lib/loadCompanies";
import { useSession } from "@/lib/auth";
import { loadOrCreateProfile, saveStreak } from "@/lib/profile";
import { recordVote } from "@/lib/votes";
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
type Dim = "category" | "region" | "stage";

function Logo({ c, cls }: { c: Company; cls: string }) {
  return (
    <div className={cls} style={{ background: c.gradient }}>
      {c.name[0]}
      <img
        src={`https://logo.clearbit.com/${c.website}`}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

interface Pick {
  q: QKey;
  win: string;
  lose: string;
}

export default function App() {
  const { userId, anonDisabled } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<View>("vote");
  const [streak, setStreak] = useState(0);
  const [pickIndex, setPickIndex] = useState(0);
  const [pair, setPair] = useState<[number, number]>([0, 1]);
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
  const [boardQ, setBoardQ] = useState<BoardQ>("ALL");
  const [dim, setDim] = useState<Dim>("category");
  const [filter, setFilter] = useState<string>("All");
  const [profileId, setProfileId] = useState<number | null>(null);
  const [form, setForm] = useState({ url: "", name: "", cat: "AI Infra", reg: "US", blurb: "" });

  useEffect(() => {
    let cancelled = false;
    loadCompanies().then((list) => {
      if (cancelled) return;
      setCompanies(list);
      setPair(firstPair(list));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Once the pseudonymous identity settles, hydrate the persisted streak/tier
  // from `profiles` (creating the row on first visit).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadOrCreateProfile(userId).then((p) => {
      if (!cancelled) setStreak(p.streak);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const tier = tierFor(streak);
  const voteQ = QORDER[Math.min(pickIndex, 2)];
  // Company ids come from Supabase's identity column, not a 0-based array
  // index — always look companies up by id, never by position.
  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const [a, b] = pair;
  const A = byId.get(a);
  const B = byId.get(b);

  function keyFor(d: Dim): keyof Company {
    return d === "category" ? "category" : d === "region" ? "region" : "stage";
  }

  function nearestPair(list: Company[], qk: QKey): [number, number] {
    const ai = Math.floor(Math.random() * list.length);
    const anchor = list[ai];
    const pool = list
      .filter((c) => c.id !== anchor.id)
      .sort(
        (x, y) =>
          Math.abs(x.ratings[qk].elo - anchor.ratings[qk].elo) -
          Math.abs(y.ratings[qk].elo - anchor.ratings[qk].elo),
      )
      .slice(0, 6);
    const bi = pool[Math.floor(Math.random() * pool.length)];
    return [anchor.id, bi.id];
  }

  function newMatch(next = companies, pi = pickIndex) {
    setPair(nearestPair(next, QORDER[Math.min(pi, 2)]));
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
    const { dw, dl } = eloDeltas(winner, loser, qk, tier.mult);
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

  // Lock in the current provisional selection: record the vote, apply the
  // (local-only) Elo, advance to the next pick or the daily-complete screen.
  function commitPick() {
    if (!decided) return;
    const qk = voteQ;
    const side = decided.winSide;
    const next = companies.map((c) => ({ ...c, ratings: { ...c.ratings } }));
    const nextById = new Map(next.map((c) => [c.id, c]));
    const winner = nextById.get(side === "A" ? a : b)!;
    const loser = nextById.get(side === "A" ? b : a)!;

    // Now that it's confirmed, append the comparison to the immutable `votes`
    // log (the real record). Fire-and-forget so a failed insert can't block UI.
    if (userId) {
      void recordVote({
        voterId: userId,
        companyA: a,
        companyB: b,
        dimension: qk,
        winner: winner.id,
        voterTier: tier.name,
      });
    }

    // Optimistic LOCAL-ONLY Elo move. TODO(server route): a SECURITY DEFINER
    // function should validate the vote and apply the real rating update
    // server-side so ratings can't be forged by the client (CLAUDE.md / §7,§9).
    applyElo(winner, loser, qk, tier.mult);
    setCompanies(next);
    setTodaysPicks((p) => [...p, { q: qk, win: winner.name, lose: loser.name }]);
    setDecided(null);

    const nextIndex = pickIndex + 1;
    setPickIndex(nextIndex);
    if (nextIndex >= 3) {
      setStreak((s) => {
        const bumped = s + 1;
        if (userId) void saveStreak(userId, bumped); // persist the day's streak
        return bumped;
      });
      setView("done");
    } else {
      newMatch(next, nextIndex);
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
    setDecided(null);
    setPair(nearestPair(companies, "V"));
    setView("vote");
  }

  function submitCompany() {
    if (!form.name.trim()) return;
    const website =
      form.url.trim().replace(/^https?:\/\//, "").replace(/\/.*/, "") || "example.com";
    const id = Math.max(0, ...companies.map((c) => c.id)) + 1;
    const grad = "linear-gradient(135deg,#0eb6a6,#37b6ff)";
    const r = () => ({ elo: 1500, games: 0, weekMovement: 0, seasonStart: 1500 });
    setCompanies([
      ...companies,
      {
        id,
        name: form.name.trim(),
        website,
        category: form.cat,
        region: form.reg,
        stage: "Growth",
        blurb: form.blurb.trim() || "Freshly submitted — awaiting details.",
        gradient: grad,
        ratings: { V: r(), G: r(), D: r() },
      },
    ]);
    setForm({ url: "", name: "", cat: "AI Infra", reg: "US", blurb: "" });
    setView("board");
    setBoardQ("ALL");
  }

  const ranked = useMemo(
    () => (qk: BoardQ) => [...companies].sort((x, y) => eloOf(y, qk) - eloOf(x, qk)),
    [companies],
  );
  const rankOf = (id: number, qk: BoardQ) => ranked(qk).findIndex((c) => c.id === id) + 1;

  // ---------- render helpers ----------
  const Fighter = ({ c, side }: { c: Company; side: "A" | "B" }) => {
    const cf = confidence(c, voteQ);
    const selected = decided && decided.winSide === side;
    const delta = decided ? (side === "A" ? decided.dA : decided.dB) : 0;
    const previewElo = decided ? (side === "A" ? decided.eloA : decided.eloB) : c.ratings[voteQ].elo;
    return (
      <div
        className={`fighter${selected ? " win" : ""}`}
        onClick={() => selectSide(side)}
        role="button"
        aria-pressed={!!selected}
      >
        <div className={`tag ${cf === "Established" ? "est" : "prov"}`}>{cf}</div>
        <Logo c={c} cls="emoji" />
        <div className="nm">{c.name}</div>
        <div className="cat">
          {c.category} · {c.region} · {c.stage}
        </div>
        <div className="blurb">{c.blurb}</div>
        {decided && (
          <>
            <div className="elo">
              {QUESTIONS[voteQ].emoji} Elo {previewElo}
            </div>
            <div className={`delta ${delta >= 0 ? "up" : "down"}`}>
              {delta >= 0 ? "▲ +" : "▼ "}
              {delta}
            </div>
          </>
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

  return (
    <div className="wrap">
      <header className="top">
        <div className="logo">
          <span className="spark">⚡</span> Conviction<b>ELO</b>
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
        <button className="simday" onClick={simDay}>
          ▶ new day
        </button>
      </div>

      {/* VOTE */}
      {view === "vote" && (
        <section>
          <div className="qbar">
            <div className="k">
              Pick {Math.min(pickIndex, 2) + 1} of 3 · {QUESTIONS[voteQ].label}
            </div>
            <h1 dangerouslySetInnerHTML={{ __html: QUESTIONS[voteQ].q }} />
          </div>
          <div className="arena">
            <Fighter c={A} side="A" />
            <div className="vs">
              <div className="orb">VS</div>
            </div>
            <Fighter c={B} side="B" />
          </div>
          <div className="subq">
            {QORDER.map((k, i) => (
              <span
                key={k}
                className={`chip ${i === pickIndex ? "active" : i < pickIndex ? "done" : "up"}`}
              >
                {i < pickIndex ? "✓ " : ""}
                {QUESTIONS[k].chip}
              </span>
            ))}
          </div>
          <button className="skip" onClick={() => newMatch()}>
            🤷 Can&apos;t decide — skip (free)
          </button>
          {decided && (
            <>
              <div className="resultmsg">
                {(() => {
                  const pct = Math.round(expected(A, B, voteQ) * 100);
                  const w = decided.winSide === "A" ? A : B;
                  return pct >= 70
                    ? `Chalk pick ✅ — ${w.name} was favoured`
                    : pct <= 35
                      ? `🚨 Upset! You backed the underdog ${w.name}`
                      : `Coin-flip call — ${w.name} edges it`;
                })()}
              </div>
              <button className="nextbtn" onClick={commitPick}>
                {pickIndex >= 2 ? "Lock it in — see results →" : "Lock it in — next pick →"}
              </button>
              <button className="skip" onClick={() => setDecided(null)}>
                ↩ tap a card to switch, or clear selection
              </button>
            </>
          )}
          <p className="note">
            {anonDisabled
              ? "⚠ Anonymous sign-ins are disabled in Supabase — votes aren’t being recorded yet. Enable them in Authentication → Sign In / Providers."
              : "Votes are recorded to your pseudonymous profile · logos via Clearbit"}
          </p>
        </section>
      )}

      {/* DONE */}
      {view === "done" && (
        <section className="done-card">
          <div className="big">🎯</div>
          <h2>Daily set complete!</h2>
          <p>Three calls, three dimensions. Here&apos;s how you voted today:</p>
          <div className="verdictbox">
            {todaysPicks.map((p, i) => (
              <div className="vr" key={i}>
                <span className="q">{QUESTIONS[p.q].chip}</span>
                <span className="p">
                  {p.win}{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>over {p.lose}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="streakup">
            🔥 {streak} day streak · {tier.name}
          </div>
          <p style={{ fontSize: 12.5 }}>Come back tomorrow to keep the streak alive.</p>
          <button className="simday" onClick={simDay} style={{ marginTop: 8 }}>
            ▶ Simulate tomorrow
          </button>
        </section>
      )}

      {/* BOARD */}
      {view === "board" && (
        <section>
          <h2 className="sec">🏆 The Tables</h2>
          <div className="segwrap" id="ratingSeg">
            {(["ALL", "V", "G", "D"] as BoardQ[]).map((q) => (
              <button
                key={q}
                className={boardQ === q ? "active" : ""}
                onClick={() => setBoardQ(q)}
              >
                {q === "ALL" ? "🏆 Overall" : `${QUESTIONS[q].emoji} ${QUESTIONS[q].label}`}
              </button>
            ))}
          </div>
          <div className="segwrap">
            {(["category", "region", "stage"] as Dim[]).map((d) => (
              <button
                key={d}
                className={dim === d ? "active" : ""}
                onClick={() => {
                  setDim(d);
                  setFilter("All");
                }}
              >
                By {d}
              </button>
            ))}
          </div>
          <div className="lbtabs">
            {["All", ...Array.from(new Set(companies.map((c) => c[keyFor(dim)] as string)))].map(
              (o) => (
                <button
                  key={o}
                  className={`chip tab ${o === filter ? "active" : ""}`}
                  onClick={() => setFilter(o)}
                >
                  {o === "All" ? "🌍 Global" : o}
                </button>
              ),
            )}
          </div>
          <div>
            {ranked(boardQ)
              .filter((c) => filter === "All" || (c[keyFor(dim)] as string) === filter)
              .map((c, i) => {
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
              })}
          </div>
        </section>
      )}

      {/* PROFILE */}
      {view === "profile" && profileId !== null && byId.get(profileId) && (() => {
        const c = byId.get(profileId)!;
        const games = c.ratings.V.games + c.ratings.G.games + c.ratings.D.games;
        return (
          <section>
            <button className="skip" style={{ margin: "0 0 12px" }} onClick={() => setView("board")}>
              ← back to tables
            </button>
            <div className="form" style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <Logo c={c} cls="em" />
                <div>
                  <h2 className="sec" style={{ margin: 0 }}>
                    {c.name}
                  </h2>
                  <div className="cat">
                    {c.category} · {c.region} · {c.stage} stage
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>{c.blurb}</p>
              <div className="vr">
                <span className="q">🏆 Overall rank (composite)</span>
                <span className="p">
                  #{rankOf(c.id, "ALL")} · {composite(c)} Elo
                </span>
              </div>
              <div className="segwrap" style={{ marginTop: 10 }}>
                {(["V", "G", "D"] as QKey[]).map((q) => (
                  <div key={q} style={{ flex: 1, textAlign: "center", padding: "6px 4px" }}>
                    <div style={{ fontWeight: 900, color: "var(--sky)" }}>{c.ratings[q].elo}</div>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>#{rankOf(c.id, q)}</div>
                    <div className="cat">
                      {QUESTIONS[q].emoji} {QUESTIONS[q].label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="vr">
                <span className="q">Total matchups</span>
                <span className="p">{games}</span>
              </div>
              <div className="vr">
                <span className="q">Website</span>
                <span className="p" style={{ color: "var(--sky)" }}>
                  {c.website}
                </span>
              </div>
            </div>
          </section>
        );
      })()}

      {/* SUBMIT */}
      {view === "submit" && (
        <section>
          <h2 className="sec">
            ➕ Submit a startup <small>· get it into the arena</small>
          </h2>
          <div className="form">
            <label>Company website</label>
            <input
              placeholder="https://acme.ai"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <label>Company name</label>
            <input
              placeholder="Acme"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Category</label>
                <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                  {["AI Infra", "Fintech", "Dev Tools", "Consumer", "SaaS", "Hardware", "Health"].map(
                    (o) => (
                      <option key={o}>{o}</option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label>Region</label>
                <select value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value })}>
                  {["US", "Europe", "APAC", "Israel", "LatAm", "Other"].map((o) => (
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
            <button className="submitbtn" onClick={submitCompany}>
              Add to the arena →
            </button>
          </div>
          <p className="note">
            In the real app this creates a <b>pending</b> profile reviewed wiki-style before going
            live.
          </p>
        </section>
      )}

      <nav className="bottom">
        <button className={view === "vote" || view === "done" ? "active" : ""} onClick={() => setView("vote")}>
          <span className="ic">⚔️</span>Vote
        </button>
        <button className={view === "board" || view === "profile" ? "active" : ""} onClick={() => setView("board")}>
          <span className="ic">🏆</span>Tables
        </button>
        <button className={view === "submit" ? "active" : ""} onClick={() => setView("submit")}>
          <span className="ic">➕</span>Submit
        </button>
      </nav>
    </div>
  );
}

function firstPair(list: Company[]): [number, number] {
  const ai = Math.floor(Math.random() * list.length);
  const anchor = list[ai];
  const pool = list
    .filter((c) => c.id !== anchor.id)
    .sort(
      (x, y) =>
        Math.abs(x.ratings.V.elo - anchor.ratings.V.elo) -
        Math.abs(y.ratings.V.elo - anchor.ratings.V.elo),
    )
    .slice(0, 6);
  return [anchor.id, pool[Math.floor(Math.random() * pool.length)].id];
}
