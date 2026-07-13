import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { QUESTIONS } from "@/lib/questions";
import { parseShareParams } from "@/lib/share";
import { loadShareCompanies, type ShareCompany } from "@/lib/shareData";

// Dynamic Open Graph image for share links (/s?…) — the champion card,
// rendered server-side at 1200×630 so a share on X/WhatsApp/LinkedIn unfurls
// as a branded result instead of bare text. Cached per-URL at the CDN.
//
// Edge runtime is REQUIRED here: the Node build of @vercel/og has a Windows
// path bug (crashes at import when the project path contains a space, e.g.
// "Claude Workspace") — and edge is the better fit for this route anyway.
export const runtime = "edge";

const INK = "#1c1a2e";
const TEAL = "#0eb6a6";
const SKY = "#37b6ff";
const GOLD = "#ffb638";
const MUTED = "rgba(247,248,252,0.62)";
const PAPER = "#f7f8fc";

// Space Grotesk for the card. Google's css2 endpoint serves TTF (which satori
// requires) when asked with a legacy user agent — the standard trick. Cached
// at module scope; on any failure the card falls back to satori's default font.
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap";
let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> | null = null;
async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const css = await fetch(FONT_CSS, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:20.0) Gecko/20100101 Firefox/20.0" },
      }).then((r) => r.text());
      const faces = [...css.matchAll(/font-weight:\s*(400|700);[^}]*?url\((https:[^)]+\.ttf)\)/g)];
      return Promise.all(
        faces.map(async (m) => ({
          name: "Space Grotesk",
          weight: Number(m[1]) as 400 | 700,
          data: await fetch(m[2]).then((r) => r.arrayBuffer()),
        })),
      );
    })().catch(() => []);
  }
  return fontsPromise;
}

function LogoTile({ co, size }: { co: ShareCompany | undefined; size: number }) {
  const radius = Math.round(size * 0.27);
  if (co?.logoUrl) {
    return (
      <div
        style={{
          display: "flex",
          width: size,
          height: size,
          borderRadius: radius,
          background: "#fff",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 0 4px rgba(34,201,160,0.55)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={co.logoUrl}
          alt=""
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          style={{ objectFit: "contain", borderRadius: Math.round(size * 0.14) }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: radius,
        background: co?.gradient ?? `linear-gradient(135deg, ${TEAL}, ${SKY})`,
        color: "#fff",
        fontSize: Math.round(size * 0.46),
        fontWeight: 700,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 4px rgba(34,201,160,0.55)`,
      }}
    >
      {(co?.name ?? "C")[0]}
    </div>
  );
}

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const p = parseShareParams(sp);
  const ids = p ? [p.c, ...(p.x ? [p.x] : []), ...p.o] : [];
  const [fonts, companies] = await Promise.all([loadFonts(), loadShareCompanies(ids)]);

  const champ = p ? companies.get(p.c) : undefined;
  const conqueror = p?.x ? companies.get(p.x) : undefined;
  const q = QUESTIONS[p?.k ?? "V"];
  const dateStr = p?.dt ?? "";

  const kicker = !p || !champ
    ? "HEAD-TO-HEAD STARTUP RANKING"
    : p.t === "r"
      ? `EXHIBITION RUN · ${q.label.toUpperCase()} · ${dateStr}`
      : `TODAY'S GAUNTLET · ${q.label.toUpperCase()} · ${dateStr}`;

  const heroName = champ?.name ?? "Coliseo";

  const subline = !p || !champ
    ? "Vote on startup matchups. Discover companies you didn't know."
    : p.t === "d"
      ? "My pick — last one standing"
      : p.out === "undefeated"
        ? `Retired undefeated — ${p.n} straight win${p.n === 1 ? "" : "s"}`
        : p.out === "retired"
          ? `Retired with ${p.n} exhibition win${p.n === 1 ? "" : "s"}`
          : p.n === 0
            ? `Fell in the opening bout${conqueror ? ` to ${conqueror.name}` : ""}`
            : `Outlasted ${p.n} challenger${p.n === 1 ? "" : "s"}${conqueror ? ` before falling to ${conqueror.name}` : ""}`;

  const outlasted = p && p.t === "d" ? p.o.map((id) => companies.get(id)).filter(Boolean) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px",
          color: PAPER,
          background: INK,
          backgroundImage: `radial-gradient(circle at 88% -10%, rgba(14,182,166,0.30) 0%, transparent 45%), radial-gradient(circle at -6% 14%, rgba(55,182,255,0.22) 0%, transparent 40%), radial-gradient(circle at 55% 118%, rgba(255,182,56,0.14) 0%, transparent 40%)`,
          fontFamily: '"Space Grotesk", sans-serif',
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                width: 52,
                height: 52,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${TEAL}, ${SKY})`,
                color: "#fff",
                fontSize: 30,
                fontWeight: 700,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Coliseo</div>
              <div style={{ fontSize: 15, color: MUTED }}>Head-to-Head Startup Ranking &amp; Discovery</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 17, fontWeight: 700, letterSpacing: 2.5, color: MUTED }}>
            {kicker}
          </div>
        </div>

        {/* hero */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 44 }}>👑</div>
            <LogoTile co={champ} size={148} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 820 }}>
            <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02 }}>{heroName}</div>
            <div style={{ display: "flex", fontSize: 28, color: GOLD, fontWeight: 700 }}>{subline}</div>
            {outlasted.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", fontSize: 19, color: MUTED, fontWeight: 700, letterSpacing: 1.5 }}>
                  OUTLASTED
                </div>
                {outlasted.map((co) => (
                  <div
                    key={co!.id}
                    style={{
                      display: "flex",
                      fontSize: 21,
                      fontWeight: 700,
                      color: PAPER,
                      background: "rgba(247,248,252,0.10)",
                      border: "1px solid rgba(247,248,252,0.22)",
                      borderRadius: 999,
                      padding: "7px 18px",
                    }}
                  >
                    {co!.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>
            {p && p.t === "d" && p.s > 0 ? `🔥 ${p.s}-day streak` : "⚔️ Which would you back?"}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: MUTED, fontWeight: 700 }}>
            convictionelo.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length ? fonts : undefined,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
