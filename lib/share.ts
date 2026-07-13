import type { QKey } from "./types";

// Canonical public origin for share links + OG image URLs. The old
// convictionelo.vercel.app URL keeps serving (beta links live on); this is
// what NEW share links spread.
export const SITE_URL = "https://coliseoelo.com";

// A share link's payload, carried in /s query params and consumed by both the
// share landing page (app/s/page.tsx) and the OG image (app/api/og/route.tsx).
// Company IDs only — names/logos are looked up server-side, so links stay
// short and can't carry arbitrary text.
export interface ShareParams {
  t: "d" | "r" | "c"; // d = daily gauntlet, r = exhibition run, c = company profile (OG only)
  c: number; // champion company id
  k: QKey; // the day's dimension
  s: number; // streak (daily only; 0 = omit)
  o: number[]; // outlasted company ids (daily; capped)
  out: "dethroned" | "undefeated" | "retired" | null; // run outcome
  n: number; // run defenses
  x: number | null; // conqueror company id (dethroned runs)
  dt: string; // YYYY-MM-DD
}

const qs = (pairs: Record<string, string | number | null | undefined>) =>
  Object.entries(pairs)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

const today = () => new Date().toISOString().slice(0, 10);

// Sequential daily-puzzle number, Wordle-convention ("Coliseo #16"). UTC-day
// based, same clock as the daily question rotation. Epoch: July 1, 2026.
const DAY_EPOCH = Date.UTC(2026, 6, 1);
export const coliseoDayNumber = () => Math.floor((Date.now() - DAY_EPOCH) / 86_400_000) + 1;

// ---- Company profile slugs (/c/[slug]) ----
// Shape: "monzo-51" — the trailing id is canonical (rename-proof, no DB slug
// column needed); the name part is cosmetic + SEO. A wrong/stale name part
// 301s to the canonical slug.
const kebab = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (post-NFKD combining marks)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "co";

export const companySlug = (c: { id: number; name: string }) => `${kebab(c.name)}-${c.id}`;

// Extract the canonical id from a profile slug ("monzo-51" → 51; bare "51" works too).
export function slugId(slug: string): number | null {
  const m = /(?:^|-)(\d+)$/.exec(slug);
  const id = m ? Number(m[1]) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function buildDailyShareUrl(input: {
  champId: number;
  qk: QKey;
  streak: number;
  outlastedIds: number[];
}): string {
  return `${SITE_URL}/s?${qs({
    t: "d",
    c: input.champId,
    k: input.qk,
    s: input.streak || null,
    o: input.outlastedIds.slice(0, 5).join(",") || null,
    dt: today(),
  })}`;
}

export function buildRunShareUrl(input: {
  champId: number;
  qk: QKey;
  outcome: "dethroned" | "undefeated" | "retired";
  defenses: number;
  conquerorId?: number | null;
}): string {
  return `${SITE_URL}/s?${qs({
    t: "r",
    c: input.champId,
    k: input.qk,
    out: input.outcome,
    n: input.defenses,
    x: input.conquerorId ?? null,
    dt: today(),
  })}`;
}

// Rebuild the sanitized query string from parsed params (used by /s to point
// its OG meta tags at /api/og with exactly the fields that matter).
export function shareQuery(p: ShareParams): string {
  const parts = [`t=${p.t}`, `c=${p.c}`, `k=${p.k}`];
  if (p.t === "d") {
    if (p.s) parts.push(`s=${p.s}`);
    if (p.o.length) parts.push(`o=${p.o.join(",")}`);
  } else {
    if (p.out) parts.push(`out=${p.out}`);
    parts.push(`n=${p.n}`);
    if (p.x) parts.push(`x=${p.x}`);
  }
  parts.push(`dt=${p.dt}`);
  return parts.join("&");
}

// Server-side parse of /s (and /api/og) query params. Tolerant: anything
// malformed degrades to a generic card rather than erroring.
export function parseShareParams(
  sp: Record<string, string | string[] | undefined>,
): ShareParams | null {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const c = Number(one("c"));
  if (!Number.isFinite(c) || c <= 0) return null;
  const tRaw = one("t");
  const t = tRaw === "r" ? "r" : tRaw === "c" ? "c" : "d";
  const kRaw = one("k");
  const k: QKey = kRaw === "V" || kRaw === "G" || kRaw === "D" ? kRaw : "V";
  const outRaw = one("out");
  const out =
    outRaw === "dethroned" || outRaw === "undefeated" || outRaw === "retired" ? outRaw : null;
  const o = (one("o") ?? "")
    .split(",")
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0)
    .slice(0, 5);
  const x = Number(one("x"));
  const dtRaw = one("dt") ?? "";
  return {
    t,
    c,
    k,
    s: Math.max(0, Math.min(9999, Number(one("s")) || 0)),
    o,
    out,
    n: Math.max(0, Math.min(99, Number(one("n")) || 0)),
    x: Number.isFinite(x) && x > 0 ? x : null,
    dt: /^\d{4}-\d{2}-\d{2}$/.test(dtRaw) ? dtRaw : today(),
  };
}
