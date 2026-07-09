"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company, QKey } from "@/lib/types";
import { QUESTIONS, QORDER } from "@/lib/questions";
import { loadCompanies } from "@/lib/loadCompanies";
import { CATEGORIES, REGIONS } from "@/lib/companies.data";
import { useSession } from "@/lib/auth";
import { loadProfile, saveStreak } from "@/lib/profile";
import { castVote } from "@/lib/castVote";
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
type Dim = "category" | "region" | "stage";

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
  const [form, setForm] = useState({ url: "", name: "", cat: "AI", reg: "US", blurb: "", logoUrl: "" });
  const [enrich, setEnrich] = useState<{ state: "idle" | "loading" | "ok" | "err"; msg: string }>({
    state: "idle",
    msg: "",
  });

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
  // from `profiles` (the row is created lazily by saveStreak, not here).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadProfile(userId).then((p) => {
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
    setTodaysPicks((p) => [...p, { q: qk, win: winner.name, lose: loser.name }]);
    setDecided(null);

    // Authoritative server record + Elo. Reconcile local ratings to the values
    // the DB actually applied (self-heals any optimistic drift; on refresh the
    // app reloads from the DB anyway).
    if (userId) {
      void castVote({ companyA: a, companyB: b, dimension: qk, winner: winnerId }).then(
        (outcome) => {
          if (!outcome.ok) {
            if (!outcome.alreadyVoted) console.error("cast_vote failed:", outcome.error);
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
      setView("done");
    } else {
      newMatch(next, nextIndex);
    }
  }

  // "I don't know this company." Records an obscurity signal for that specific
  // company (not a vote — never touches Elo) and reshuffles the matchup, since
  // you can't judge a pair you don't recognise.
  function markUnknown(company: Company) {
    if (userId) void flagUnknown(userId, company.id, voteQ);
    newMatch();
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
        logoUrl: form.logoUrl || null,
      },
    ]);
    setForm({ url: "", name: "", cat: "AI", reg: "US", blurb: "", logoUrl: "" });
    setEnrich({ state: "idle", msg: "" });
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
          {!decided && (
            <div className="dunno">
              <span className="dunno-l">Don&apos;t know them?</span>
              <button className="dunno-b" onClick={() => markUnknown(A)}>
                ❓ {A.name}
              </button>
              <button className="dunno-b" onClick={() => markUnknown(B)}>
                ❓ {B.name}
              </button>
            </div>
          )}
          <button className="skip" onClick={() => newMatch()}>
            🤔 Too close to call — skip
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
              : "Votes are recorded to your pseudonymous profile · 255 startups and counting"}
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
          <section>
            <button className="skip" style={{ margin: "0 0 12px" }} onClick={() => setView("board")}>
              ← back to tables
            </button>
            <div className="dossier">
              <div className="profile-head">
                <Logo c={c} cls="em-lg" />
                <div className="profile-id">
                  <h2 className="sec" style={{ margin: 0 }}>
                    {c.name}
                  </h2>
                  <div className="cat">
                    {c.category} · {c.region} · {c.stage}-stage
                  </div>
                  <a className="weblink" href={`https://${c.website}`} target="_blank" rel="noreferrer">
                    {c.website} ↗
                  </a>
                </div>
              </div>

              {c.tags && c.tags.length > 0 && (
                <div className="profile-tags">
                  {c.tags.map((t) => (
                    <span key={t} className="ptag">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {(c.description || c.blurb) && (
                <p className="profile-desc">{c.description || c.blurb}</p>
              )}

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

              <div className="dossier-sub">📊 ConvictionELO ratings</div>
              <div className="vr">
                <span className="q">🏆 Overall rank</span>
                <span className="p">
                  #{rankOf(c.id, "ALL")} · {composite(c)} Elo
                </span>
              </div>
              <div className="rating-cards">
                {(["V", "G", "D"] as QKey[]).map((q) => (
                  <div className="rcard" key={q}>
                    <div className="rc-elo">{c.ratings[q].elo}</div>
                    <div className="rc-rank">#{rankOf(c.id, q)}</div>
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
                <a href={`https://${c.website}`} target="_blank" rel="noreferrer" className="linkbtn">
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

              <button className="skip suggest-edit" onClick={() => alert("Suggest-an-edit is coming soon — it will create a pending revision reviewed wiki-style.")}>
                ✏️ Suggest an edit
              </button>
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
