// Bulk-import ACTIVE Y Combinator companies from the open yc-oss dataset into
// the live DB. Idempotent: skips companies already present (by yc_id or domain),
// so it doubles as the manual step behind the ongoing sync. No YC API key —
// yc-oss re-pulls YC's own Algolia index daily and republishes it as open JSON.
//
//   npm run db:import-yc            # import
//   npm run db:import-yc -- --dry   # count only, no writes
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import type { QKey } from "../lib/types";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DRY = process.argv.includes("--dry");
const YC_URL = "https://yc-oss.github.io/api/companies/all.json";
const DIMENSIONS: QKey[] = ["V", "G", "D"];
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL (set it in .env.local).");
  process.exit(1);
}

const bareDomain = (u: string | null | undefined): string =>
  (u ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim().toLowerCase();

// YC industry/subindustry/tags -> Coliseo category. First rule whose keyword
// appears wins; order runs specific -> general. Categories are free-form in the
// DB and the crowd corrects over time, so "good enough" is the bar.
const CAT_RULES: [string, string[]][] = [
  ["AI", ["artificial intelligence", "machine learning", "generative ai", "deep learning", "computer vision", "conversational ai", "ai assistant", "ai agent", "llm"]],
  ["Crypto", ["crypto", "blockchain", "web3", "defi", "nft", "ethereum", "bitcoin"]],
  ["Fintech", ["fintech", "payments", "banking", "lending", "insurance", "financial", "neobank", "credit"]],
  ["Security", ["security", "cybersecurity", "privacy", "fraud"]],
  ["Bio", ["biotech", "synthetic biology", "drug discovery", "therapeutics", "genomics", "bioinformatics", "pharma"]],
  ["Health", ["healthcare", "health tech", "health & wellness", "medical", "mental health", "digital health", "telehealth", "consumer health", "clinical", "diagnostics"]],
  ["Climate", ["climate", "clean energy", "renewable", "sustainability", "carbon", "solar", "energy storage", "greentech"]],
  ["Space & Defense", ["aerospace", "defense", "defence", "aviation", "drone", "satellite", "space "]],
  ["Robotics", ["robotics", "robot"]],
  ["Hardware", ["hardware", "hard tech", "manufacturing", "electronics", "semiconductor", "iot", "3d print"]],
  ["Mobility", ["automotive", "transportation", "mobility", "autonomous vehicle", "self-driving"]],
  ["Logistics", ["logistics", "supply chain", "freight", "last mile", "shipping", "warehouse"]],
  ["Proptech", ["real estate", "construction", "proptech", "housing"]],
  ["Edtech", ["education", "edtech", "e-learning", "learning"]],
  ["Media & Gaming", ["gaming", "games", "media", "entertainment", "music", "video", "streaming", "creator economy", "content"]],
  ["Dev Tools", ["developer tools", "devops", "devtools", "open source", "developer platform", "sdk", "api "]],
  ["Data & Infra", ["data engineering", "analytics", "database", "infrastructure", "big data", "cloud", "data science", "observability"]],
  ["Commerce", ["e-commerce", "ecommerce", "marketplace", "retail", "consumer goods", "shopping", "d2c"]],
  ["Productivity", ["productivity", "collaboration", "project management", "scheduling", "workflow", "no-code"]],
  ["SaaS", ["saas", "b2b", "enterprise", "sales", "marketing", "crm", "hr tech", "recruiting", "customer service", "legal", "operations"]],
  ["Consumer", ["consumer", "social", "community", "dating", "travel", "food", "fitness", "wellness", "lifestyle"]],
];
const INDUSTRY_FALLBACK: Record<string, string> = {
  fintech: "Fintech", healthcare: "Health", education: "Edtech",
  "real estate and construction": "Proptech", industrials: "Hardware",
  consumer: "Consumer", b2b: "SaaS", government: "SaaS",
};
function mapCategory(c: any): string {
  const text = [(c.tags ?? []).join(" | "), c.subindustry ?? "", c.industry ?? ""].join(" | ").toLowerCase();
  for (const [cat, kws] of CAT_RULES) if (kws.some((k) => text.includes(k))) return cat;
  return INDUSTRY_FALLBACK[(c.industry ?? "").toLowerCase()] ?? "SaaS";
}

const REGION_RULES: [string, string[]][] = [
  ["LatAm", ["latin america", "mexico", "brazil", "argentina", "colombia", "chile"]],
  ["India", ["india", "south asia"]],
  ["Israel", ["israel"]],
  ["MENA", ["middle east", "north africa"]],
  ["Africa", ["africa"]],
  ["APAC", ["southeast asia", "east asia", "asia", "australia", "oceania", "new zealand"]],
  ["Europe", ["europe", "united kingdom"]],
  ["US", ["united states of america"]],
  ["Canada", ["canada"]],
];
function mapRegion(c: any): string {
  const text = ((c.regions ?? []) as string[]).join(" | ").toLowerCase() + " | " + (c.all_locations ?? "").toLowerCase();
  for (const [reg, kws] of REGION_RULES) if (kws.some((k) => text.includes(k))) return reg;
  return "Other";
}

function mapEmployees(n: number | null | undefined): string | null {
  if (!n || n < 1) return null;
  if (n <= 10) return "1–10";
  if (n <= 50) return "11–50";
  if (n <= 200) return "51–200";
  if (n <= 1000) return "201–1,000";
  if (n <= 5000) return "1,001–5,000";
  return "5,000+";
}

const GRADS: [string, string][] = [
  ["#0eb6a6", "#37b6ff"], ["#22c9a0", "#37b6ff"], ["#37b6ff", "#0eb6a6"], ["#ff6b8b", "#ff8a5c"],
  ["#ffb638", "#ff8a5c"], ["#8fd93a", "#22c9a0"], ["#37b6ff", "#8fd93a"], ["#0a8f93", "#37b6ff"],
  ["#ff8a5c", "#ffb638"], ["#22c9a0", "#8fd93a"], ["#ff6b8b", "#0eb6a6"], ["#37b6ff", "#22c9a0"],
];
function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = GRADS[h % GRADS.length];
  return `linear-gradient(135deg,${a},${b})`;
}
function baseElo(p: number, i: number): number {
  const off: Record<number, number> = { 5: 55, 4: 30, 3: 8, 2: -12, 1: -30 };
  return 1500 + (off[p] ?? -40) + ((i * 37) % 21) - 10;
}

interface Row {
  name: string; website: string; category: string; region: string; stage: string;
  blurb: string; gradient: string; prominence: number; logo_url: string | null;
  description: string | null; founded_year: number | null; headquarters: string | null;
  employees: string | null; tags: string[] | null; yc_id: number;
  elos: Record<QKey, number>;
}

function placeholders(rowCount: number, colsPerRow: number, suffix = ""): string {
  const rows: string[] = [];
  let n = 0;
  for (let r = 0; r < rowCount; r++) {
    const cols = Array.from({ length: colsPerRow }, () => `$${++n}`);
    rows.push(`(${cols.join(",")}${suffix})`);
  }
  return rows.join(",");
}

async function main() {
  console.log(`Fetching ${YC_URL} …`);
  const all: any[] = await (await fetch(YC_URL)).json();
  const active = all.filter((c) => c.status === "Active");
  console.log(`YC total ${all.length}, active ${active.length}`);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Provenance columns (idempotent, non-destructive) — needed by the dedupe
    // query below, so applied even on --dry.
    await client.query(await import("node:fs").then((fs) => fs.readFileSync(path.join(__dirname, "../supabase/yc_import.sql"), "utf8")));

    // Existing domains + yc_ids, so re-runs skip what's already in.
    const { rows: existing } = await client.query<{ website: string; yc_id: number | null }>(
      "select website, yc_id from companies",
    );
    const haveDomain = new Set(existing.map((r) => bareDomain(r.website)));
    const haveYcId = new Set(existing.filter((r) => r.yc_id != null).map((r) => Number(r.yc_id)));

    const seenDomain = new Set<string>();
    const rows: Row[] = [];
    let skipDup = 0, skipNoSite = 0;
    active.forEach((c: any, idx: number) => {
      const website = bareDomain(c.website);
      if (!website) { skipNoSite++; return; }
      if (haveYcId.has(Number(c.id)) || haveDomain.has(website) || seenDomain.has(website)) { skipDup++; return; }
      seenDomain.add(website);
      const prominence = c.top_company ? 4 : 2;
      const base = baseElo(prominence, idx);
      const cat = mapCategory(c);
      const stage = c.stage === "Growth" ? "Growth" : "Early";
      const gOff = (stage === "Growth" ? 30 : -15) + (["AI", "Crypto"].includes(cat) ? 22 : 0) + ((idx * 13) % 11) - 5;
      const dOff = (["Fintech", "Dev Tools", "SaaS", "Security"].includes(cat) ? 14 : 0) - ((idx * 7) % 9);
      const logo = typeof c.small_logo_thumb_url === "string" && c.small_logo_thumb_url.startsWith("https") ? c.small_logo_thumb_url : null;
      const yr = /\b(\d{4})\b/.exec(c.batch ?? "");
      rows.push({
        name: c.name, website, category: cat, region: mapRegion(c), stage,
        blurb: (c.one_liner ?? "").slice(0, 240) || c.name,
        gradient: gradientFor(c.name), prominence, logo_url: logo,
        description: (c.long_description ?? "").slice(0, 900) || null,
        founded_year: yr ? Number(yr[1]) : null,
        headquarters: c.all_locations || null,
        employees: mapEmployees(c.team_size),
        tags: Array.isArray(c.tags) && c.tags.length ? c.tags.slice(0, 8) : null,
        yc_id: Number(c.id),
        elos: { V: base, G: base + gOff, D: base + dOff },
      });
    });

    console.log(`\nMapped ${rows.length} new companies (skipped ${skipDup} dup, ${skipNoSite} no-website).`);
    // Category + region distribution sanity check.
    const dist = (key: "category" | "region") => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join("  ");
    };
    console.log(`  categories: ${dist("category")}`);
    console.log(`  regions:    ${dist("region")}`);

    if (DRY) { console.log("\n--dry: no writes."); return; }
    if (rows.length === 0) { console.log("Nothing new to insert."); return; }

    const CHUNK = 800;
    let insertedCount = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      const cParams = batch.flatMap((r) => [
        r.name, r.website, r.category, r.region, r.stage, r.blurb, r.gradient, r.prominence,
        r.logo_url, r.description, r.founded_year, r.headquarters, r.employees,
        null, null, null, r.tags, null, "active", null, null, r.yc_id, "yc",
      ]);
      const { rows: ins } = await client.query<{ id: number }>(
        `insert into companies
           (name, website, category, region, stage, blurb, gradient, prominence,
            logo_url, description, founded_year, headquarters, employees,
            total_funding, valuation, founders, tags, links,
            lifecycle, exited_at, exit_note, yc_id, source, status)
         values ${placeholders(batch.length, 23, ", 'live'")}
         returning id`,
        cParams,
      );
      const rParams: unknown[] = [];
      ins.forEach((row, j) => {
        for (const qk of DIMENSIONS) rParams.push(row.id, qk, batch[j].elos[qk], 0, 0, batch[j].elos[qk]);
      });
      await client.query(
        `insert into ratings (company_id, dimension, elo, games, week_movement, season_start)
         values ${placeholders(ins.length * 3, 6)}`,
        rParams,
      );
      insertedCount += ins.length;
      console.log(`  inserted ${insertedCount}/${rows.length}`);
    }

    const { rows: totals } = await client.query(
      `select count(*)::int companies, count(*) filter (where lifecycle='active')::int active from companies`,
    );
    console.log(`\n✓ Imported ${insertedCount} YC companies (+${insertedCount * 3} ratings). DB now ${JSON.stringify(totals[0])}.`);
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error("Import failed:", e); process.exit(1); });
