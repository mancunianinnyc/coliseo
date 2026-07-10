import type { Company, CompanyLinks, QKey, Rating } from "./types";
import { COMPANIES, EXITS, type SeedCompany } from "./companies.data";

// Self-hosted logo path (see scripts/fetch-logos.ts). Slug = first label of the
// domain (openai.com -> openai).
export function logoSlug(website: string): string {
  return website.split(".")[0];
}

// On-brand gradient fallback (shown behind/instead of a missing logo). Picked
// deterministically from the name so a company always gets the same colours.
const GRADIENTS: [string, string][] = [
  ["#0eb6a6", "#37b6ff"], ["#22c9a0", "#37b6ff"], ["#37b6ff", "#0eb6a6"],
  ["#ff6b8b", "#ff8a5c"], ["#ffb638", "#ff8a5c"], ["#8fd93a", "#22c9a0"],
  ["#37b6ff", "#8fd93a"], ["#0a8f93", "#37b6ff"], ["#ff8a5c", "#ffb638"],
  ["#22c9a0", "#8fd93a"], ["#ff6b8b", "#0eb6a6"], ["#37b6ff", "#22c9a0"],
];
function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `linear-gradient(135deg,${a},${b})`;
}

// Provisional starting Elo from prominence. Everyone launches Provisional
// (games = 0, K = 48) with only a light nudge, so real votes quickly take over.
function baseElo(p: number, i: number): number {
  const off: Record<number, number> = { 5: 55, 4: 30, 3: 8, 2: -12, 1: -30 };
  return 1500 + (off[p] ?? -40) + ((i * 37) % 21) - 10;
}

function rating(elo: number): Rating {
  return { elo, games: 0, weekMovement: 0, seasonStart: elo };
}

function links(s: SeedCompany): CompanyLinks {
  return {
    x: s.xh ? `https://x.com/${s.xh}` : undefined,
    linkedin: s.lih ? `https://www.linkedin.com/company/${s.lih}` : undefined,
    crunchbase: s.cbh ? `https://www.crunchbase.com/organization/${s.cbh}` : undefined,
  };
}

// Builds the full Company objects from the raw seed data. Conviction Elo is the
// base; Momentum and Talent get a modest, deterministic divergence so the three
// tables tell slightly different stories at launch — real votes then take over.
export function buildCompanies(): Company[] {
  return COMPANIES.map((s, i) => {
    const base = baseElo(s.p, i);
    const gOff =
      (s.st === "Growth" ? 30 : -15) +
      (["AI", "Crypto"].includes(s.cat) ? 22 : ["Consumer", "Commerce"].includes(s.cat) ? 10 : 0) +
      ((i * 13) % 11) - 5;
    const dOff =
      (s.st === "Late" ? 32 : -12) +
      (s.cat === "Space & Defense" ? 28 : s.cat === "Fintech" ? 16 : ["Dev Tools", "SaaS", "Productivity"].includes(s.cat) ? 10 : 0) -
      (["Consumer", "Crypto"].includes(s.cat) ? 14 : 0) -
      ((i * 7) % 9);
    const ratings: Record<QKey, Rating> = {
      V: rating(base),
      G: rating(base + gOff),
      D: rating(base + dOff),
    };
    const exit = EXITS[s.n];
    return {
      id: i,
      name: s.n,
      website: s.d,
      category: s.cat,
      region: s.reg,
      stage: s.st,
      blurb: s.b,
      gradient: gradientFor(s.n),
      ratings,
      prominence: s.p,
      logoUrl: `/logos/${logoSlug(s.d)}.png`,
      description: s.desc,
      foundedYear: s.founded,
      headquarters: s.hq,
      employees: s.emp,
      totalFunding: s.funding,
      valuation: s.val,
      founders: s.fo,
      tags: s.tags,
      links: links(s),
      lifecycle: exit?.s ?? "active",
      exitedAt: exit?.year ? `${exit.year}-01-01` : null,
      exitNote: exit?.note ?? null,
    };
  });
}
