import type { Metadata } from "next";
import { QORDER, QUESTIONS } from "@/lib/questions";
import { parseShareParams, shareQuery, SITE_URL, type ShareParams } from "@/lib/share";
import { loadShareCompanies, type ShareCompany } from "@/lib/shareData";

// Share landing page — the canonical URL behind "Share my calls" / "Share the
// run". Scrapers read its OG meta (→ the /api/og champion card); humans get a
// 50/50 split: the friend's result (which they already saw in the chat message)
// and an equal-weight invitation to come play today's matchups themselves. The
// result is proof; the invitation is the point.

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

interface ShareView {
  p: ShareParams | null;
  champ: ShareCompany | undefined;
  conqueror: ShareCompany | undefined;
  outlasted: ShareCompany[];
}

async function loadView(searchParams: SP): Promise<ShareView> {
  const p = parseShareParams(searchParams);
  if (!p) return { p: null, champ: undefined, conqueror: undefined, outlasted: [] };
  const companies = await loadShareCompanies([p.c, ...(p.x ? [p.x] : []), ...p.o]);
  return {
    p,
    champ: companies.get(p.c),
    conqueror: p.x ? companies.get(p.x) : undefined,
    outlasted: p.o.map((id) => companies.get(id)).filter((c): c is ShareCompany => !!c),
  };
}

function subline(v: ShareView): string {
  const { p, conqueror } = v;
  if (!p || !v.champ) return "Head-to-head startup ranking & discovery";
  if (p.t === "d") return "Last one standing in today's gauntlet";
  if (p.out === "undefeated") return `Retired undefeated — ${p.n} straight win${p.n === 1 ? "" : "s"}`;
  if (p.out === "retired") return `Retired with ${p.n} exhibition win${p.n === 1 ? "" : "s"}`;
  return p.n === 0
    ? `Fell in the opening bout${conqueror ? ` to ${conqueror.name}` : ""}`
    : `Outlasted ${p.n} challenger${p.n === 1 ? "" : "s"}${conqueror ? ` before falling to ${conqueror.name}` : ""}`;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const v = await loadView(searchParams);
  const title = v.champ
    ? v.p!.t === "d"
      ? `${v.champ.name} — last one standing on Coliseo`
      : `${v.champ.name}'s exhibition run on Coliseo`
    : "Coliseo — head-to-head startup ranking";
  const description = v.champ
    ? `${subline(v)} · ${QUESTIONS[v.p!.k].label} day. One question a day, three picks — which would you back?`
    : "Vote on startup matchups. Discover companies you didn't know.";
  const img = v.p ? `${SITE_URL}/api/og?${shareQuery(v.p)}` : `${SITE_URL}/api/og`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function SharePage({ searchParams }: { searchParams: SP }) {
  const v = await loadView(searchParams);
  const q = QUESTIONS[v.p?.k ?? "V"];
  const kicker = v.p?.t === "r" ? `Exhibition run · ${q.label}` : `Today's gauntlet · ${q.label}`;
  // The question the visitor will actually get if they play right now — same
  // UTC-day rotation as the app (App.tsx voteQ). This is the invitation's hook:
  // show them the real question, not an abstract description of the game.
  const todayQ = QUESTIONS[QORDER[Math.floor(Date.now() / 86_400_000) % QORDER.length]];

  return (
    <div className="wrap share-landing">
      <div className="share-split">
        {/* ---- Half 1: the friend's result (proof, already seen in the chat) ---- */}
        <section className="share-their" aria-label="Your friend's result">
          <div className="done-eyebrow">
            {v.champ
              ? v.p!.t === "r"
                ? "⚔️ Your friend's exhibition run"
                : "🏆 Your friend's day in the arena"
              : "🏛️ Coliseo"}
          </div>
          <div className="sharecard champ sharecard-mini">
            <div className="sc-top">
              <span className="sc-kicker">{v.champ ? kicker : "Head-to-Head Startup Ranking"}</span>
              <span className="sc-date">{v.p?.dt ?? ""}</span>
            </div>
            <div className="sc-hero">
              <div className="sc-crown" aria-hidden="true">
                👑
              </div>
              <div
                className="sc-hero-logo"
                style={{ background: v.champ?.gradient ?? "linear-gradient(135deg,#0eb6a6,#37b6ff)" }}
              >
                {(v.champ?.name ?? "C")[0]}
                {v.champ?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.champ.logoUrl} alt="" />
                )}
              </div>
              <div className="sc-hero-name">{v.champ?.name ?? "Coliseo"}</div>
              <div className="sc-hero-sub">{subline(v)}</div>
            </div>
            {v.outlasted.length > 0 && (
              <div className="sc-beat">
                <span className="sc-beat-label">Outlasted</span>
                <div className="sc-beat-row">
                  {v.outlasted.map((co) => (
                    <span className="sc-chip" key={co.id}>
                      <span className="sc-clogo" style={{ background: co.gradient }}>
                        {co.name[0]}
                        {co.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={co.logoUrl} alt="" />
                        )}
                      </span>
                      <span>{co.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="sc-foot">
              <span className="sc-streak">
                {v.p?.t === "d" && v.p.s > 0 ? `🔥 ${v.p.s}-day streak` : "⚔️ Their call — what's yours?"}
              </span>
              <span className="sc-brandmark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="sc-mark" src="/coliseo-mark.svg" alt="" /> Coliseo
              </span>
            </div>
          </div>
        </section>

        {/* ---- Half 2: the invitation (equal weight — this is why the page exists) ---- */}
        <section className="share-invite" aria-label="Play Coliseo yourself">
          <div className="done-eyebrow">🏛️ Your turn</div>
          <h1 className="share-invite-h">
            Think you&apos;d call it{v.champ ? " " : " all "}differently?
          </h1>
          <p className="share-invite-sub">Today&apos;s question in the arena:</p>
          <p className="share-invite-q" dangerouslySetInnerHTML={{ __html: todayQ.q }} />
          <ul className="share-invite-steps">
            <li>
              <b>⚔️ Three head-to-head picks a day.</b> Winner stays on, king-of-the-hill style.
            </li>
            <li>
              <b>📈 Every vote counts.</b> Your calls move live ratings across 500 top startups.
            </li>
            <li>
              <b>🔍 Discover as you play.</b> Companies you know vs. ones you should.
            </li>
          </ul>
          <a className="nextbtn share-cta" href="/">
            ⚔️ Play today&apos;s matchups →
          </a>
          <p className="done-note">Free · no signup, you&apos;re anonymous · takes about a minute</p>
        </section>
      </div>
    </div>
  );
}
