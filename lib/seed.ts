import type { Company, QKey, Rating } from "./types";

const grad = (a: string, b: string) => `linear-gradient(135deg,${a},${b})`;

// Base seed: 18 well-known startups. Value Elo is the base; Growth and Workplace
// are derived with believable divergence so the three tables tell different stories.
interface Seed {
  n: string;
  d: string;
  cat: string;
  reg: string;
  st: "Growth" | "Late";
  b: string;
  e: number;
  g: number;
  c: string;
}

const SEED: Seed[] = [
  { n: "OpenAI", d: "openai.com", cat: "AI Infra", reg: "US", st: "Late", b: "Frontier AI models & ChatGPT.", e: 1720, g: 64, c: grad("#22c9a0", "#37b6ff") },
  { n: "Stripe", d: "stripe.com", cat: "Fintech", reg: "US", st: "Late", b: "Payments infrastructure for the internet.", e: 1695, g: 71, c: grad("#0eb6a6", "#37b6ff") },
  { n: "Anthropic", d: "anthropic.com", cat: "AI Infra", reg: "US", st: "Late", b: "Safety-first frontier AI (Claude).", e: 1668, g: 52, c: grad("#ff8a5c", "#ffb638") },
  { n: "SpaceX", d: "spacex.com", cat: "Hardware", reg: "US", st: "Late", b: "Rockets, Starlink & orbital internet.", e: 1712, g: 58, c: grad("#37b6ff", "#0eb6a6") },
  { n: "Databricks", d: "databricks.com", cat: "AI Infra", reg: "US", st: "Late", b: "Data + AI lakehouse platform.", e: 1610, g: 44, c: grad("#ff6b8b", "#ff8a5c") },
  { n: "Canva", d: "canva.com", cat: "Consumer", reg: "APAC", st: "Late", b: "Design for everyone, in the browser.", e: 1552, g: 39, c: grad("#37b6ff", "#22c9a0") },
  { n: "Ramp", d: "ramp.com", cat: "Fintech", reg: "US", st: "Growth", b: "Corporate cards & spend management.", e: 1534, g: 28, c: grad("#8fd93a", "#22c9a0") },
  { n: "Vercel", d: "vercel.com", cat: "Dev Tools", reg: "US", st: "Growth", b: "Frontend cloud & Next.js.", e: 1508, g: 22, c: grad("#1c1a2e", "#7b7893") },
  { n: "Figma", d: "figma.com", cat: "SaaS", reg: "US", st: "Late", b: "Collaborative interface design.", e: 1571, g: 41, c: grad("#ff6b8b", "#0eb6a6") },
  { n: "Notion", d: "notion.so", cat: "SaaS", reg: "US", st: "Growth", b: "Docs, wikis & the connected workspace.", e: 1499, g: 33, c: grad("#7b7893", "#1c1a2e") },
  { n: "Perplexity", d: "perplexity.ai", cat: "AI Infra", reg: "US", st: "Growth", b: "AI answer engine for the web.", e: 1523, g: 19, c: grad("#37b6ff", "#8fd93a") },
  { n: "Retool", d: "retool.com", cat: "Dev Tools", reg: "US", st: "Growth", b: "Build internal tools fast.", e: 1462, g: 16, c: grad("#0eb6a6", "#ff6b8b") },
  { n: "Rippling", d: "rippling.com", cat: "SaaS", reg: "US", st: "Growth", b: "HR, IT & finance in one system.", e: 1487, g: 24, c: grad("#22c9a0", "#8fd93a") },
  { n: "Deel", d: "deel.com", cat: "Fintech", reg: "US", st: "Growth", b: "Global payroll & compliance.", e: 1471, g: 21, c: grad("#ffb638", "#ff8a5c") },
  { n: "Wiz", d: "wiz.io", cat: "SaaS", reg: "Israel", st: "Growth", b: "Cloud security, fastest to $100M ARR.", e: 1544, g: 18, c: grad("#37b6ff", "#0eb6a6") },
  { n: "Mistral", d: "mistral.ai", cat: "AI Infra", reg: "Europe", st: "Growth", b: "Open-weight European AI models.", e: 1516, g: 14, c: grad("#ff6b8b", "#ffb638") },
  { n: "Revolut", d: "revolut.com", cat: "Fintech", reg: "Europe", st: "Late", b: "All-in-one financial super-app.", e: 1558, g: 31, c: grad("#0eb6a6", "#37b6ff") },
  { n: "Nubank", d: "nubank.com.br", cat: "Fintech", reg: "LatAm", st: "Late", b: "Digital banking for Latin America.", e: 1540, g: 27, c: grad("#0a8f93", "#ff6b8b") },
];

function rating(elo: number, games: number): Rating {
  return { elo, games, weekMovement: 0, seasonStart: elo };
}

export function buildCompanies(): Company[] {
  return SEED.map((s, i) => {
    const gOff =
      (s.st === "Growth" ? 45 : -20) +
      (s.cat === "AI Infra" ? 30 : s.cat === "Consumer" ? 15 : 0) +
      (i % 5) * 3;
    const dOff =
      (s.st === "Late" ? 45 : -15) +
      (s.cat === "Hardware" ? 45 : s.cat === "AI Infra" ? 8 : s.cat === "Fintech" ? 22 : s.cat === "Dev Tools" ? 12 : 0) -
      (s.cat === "Consumer" ? 20 : 0) -
      (i % 4) * 5;
    const ratings: Record<QKey, Rating> = {
      V: rating(s.e, s.g),
      G: rating(s.e + gOff, s.g),
      D: rating(s.e + dOff, s.g),
    };
    return {
      id: i,
      name: s.n,
      website: s.d,
      category: s.cat,
      region: s.reg,
      stage: s.st,
      blurb: s.b,
      gradient: s.c,
      ratings,
    };
  });
}
