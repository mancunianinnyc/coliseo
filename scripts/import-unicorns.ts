// Import the world's unicorns (private $1B+ companies) from the curated Wikipedia
// "List of unicorn startup companies", resolving each company's website + facts
// from Wikidata (CC0). This casts a broad, high-signal net beyond YC — exactly the
// population that belongs in the Arena500. Idempotent (skips by domain).
//
//   npm run db:import-unicorns            # import
//   npm run db:import-unicorns -- --dry   # preview counts only, no writes
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import type { QKey } from "../lib/types";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DRY = process.argv.includes("--dry");
const UA = "ColiseoBot/1.0 (rossgarlick@gmail.com)";
const DIMENSIONS: QKey[] = ["V", "G", "D"];
const conn = process.env.SUPABASE_DB_URL;
if (!conn) { console.error("Missing SUPABASE_DB_URL"); process.exit(1); }

const bareDomain = (u: string) => (u ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim().toLowerCase();
// Strip ANY trailing Wikipedia disambiguator — the old word-list version missed
// multi-word parentheticals ("(productivity software)", "(blockchain)"…), which let
// "Notion (productivity software)" bypass the name-dedupe against the seed's Notion.
const cleanName = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, "").trim();

const COUNTRIES = new Set(["afghanistan","albania","algeria","argentina","armenia","australia","austria","azerbaijan","bahrain","bangladesh","belarus","belgium","bolivia","brazil","bulgaria","cambodia","canada","chile","china","people's republic of china","colombia","costa rica","croatia","cyprus","czech republic","czechia","denmark","kingdom of denmark","ecuador","egypt","estonia","finland","france","georgia","germany","ghana","greece","hong kong","hungary","iceland","india","indonesia","iran","iraq","ireland","republic of ireland","israel","italy","japan","jordan","kazakhstan","kenya","kuwait","latvia","lebanon","liechtenstein","lithuania","luxembourg","malaysia","malta","mexico","monaco","morocco","nepal","netherlands","new zealand","nigeria","north macedonia","norway","oman","pakistan","panama","peru","philippines","poland","portugal","qatar","romania","russia","saudi arabia","senegal","serbia","seychelles","singapore","slovakia","slovenia","south africa","south korea","spain","sri lanka","sweden","switzerland","taiwan","thailand","tunisia","turkey","ukraine","united arab emirates","united kingdom","united states","united states of america","uruguay","uzbekistan","venezuela","vietnam"]);
// Known exits (IPO / acquired / dead) that Wikidata's P414/P576 miss — a manual
// blocklist so a hand-reviewed ineligible company can't re-enter on re-import.
// Keep this list append-only as new exits surface.
export const EXITED = new Set([
  "spotify","pinterest","monday.com","applovin","didi","pinduoduo","kuaishou","krafton","mercari",
  "nykaa","udemy","truecaller","douyu","coveo","deezer","global fashion group","nanthealth","cazoo",
  "darktrace","ucommune","farfetch","23andme","whatsapp","slack","mulesoft","appdynamics","postmates",
  "careem","credit karma","kabam","peak games","jet.com","gilt groupe","flipkart","tokopedia","gojek",
  "avito.ru","suning holdings group","livingsocial","letgo","shopclues","mozido","bloom energy server",
  "glovo","wolt",
  // July 2026 arena re-scan:
  "hike messenger","paytm","delhivery","walkme","j&t express","deliverr","freshly",
].map((s) => s.toLowerCase()));

const isGov = (d: string) => /(^|\.)gov(\.|$)|\.gob(\.|$)|\.go\.|admin\.ch|service-public|canada\.ca|australia\.gov|korea\.net|sweden\.se|finland\.fi|norway\.no|indonesia\.go|\.public\.|lietuva\.lt|valitsus\.ee|chinhphu|czechia\.eu|denmark\.dk|ukraine\.ua|italia\.it|iceland\.is|liechtenstein\.li|el-mouradia|oesterreich|verwaltung\.bund/.test(d);
const isMedia = (d: string) => /forbes|venturebeat|techcrunch|cbinsights|bloomberg|reuters|(^|\.)cnn|wsj|nytimes|businessinsider|wikipedia|wikimedia|crunchbase|pitchbook|tracxn|fortune|theinformation/.test(d);

function mapRegion(country: string): string {
  const t = (country || "").toLowerCase();
  if (/brazil|mexico|argentina|colombia|chile|peru|uruguay|ecuador|bolivia|venezuela|panama|costa rica/.test(t)) return "LatAm";
  if (/india|pakistan|bangladesh|sri lanka|nepal/.test(t)) return "India";
  if (/israel/.test(t)) return "Israel";
  if (/emirates|saudi|qatar|egypt|bahrain|kuwait|jordan|lebanon|oman|morocco|tunisia|iran|iraq/.test(t)) return "MENA";
  if (/nigeria|kenya|south africa|ghana|senegal/.test(t)) return "Africa";
  if (/china|japan|singapore|australia|korea|indonesia|hong kong|taiwan|vietnam|philippines|malaysia|new zealand|thailand|cambodia/.test(t)) return "APAC";
  if (/canada/.test(t)) return "Canada";
  if (/united states|america/.test(t)) return "US";
  if (t) return "Europe"; // remaining named countries are European
  return "Other";
}
const CAT: [string, RegExp][] = [
  ["AI", /artificial intelligence|machine learning/], ["Crypto", /cryptocurrency|blockchain|crypto|bitcoin/],
  ["Fintech", /financ|fintech|payment|banking|insurance|mortgage/], ["Security", /security|cybersecurity/],
  ["Bio", /biotech|pharmaceutical|life science|genomic|therapeutic/], ["Health", /health|medical|medicine|hospital/],
  ["Climate", /energy|renewable|solar|climate|environment/], ["Space & Defense", /aerospace|defense|defence|space|aviation/],
  ["Robotics", /robot/], ["Hardware", /hardware|manufacturing|electronics|semiconductor/],
  ["Mobility", /automotive|transport|mobility|vehicle|ride/], ["Logistics", /logistics|supply chain|delivery/],
  ["Proptech", /real estate|construction|property/], ["Edtech", /education|e-learning/],
  ["Media & Gaming", /video game|gaming|media|entertainment|music|film|social media/], ["Commerce", /e-commerce|retail|marketplace|commerce/],
  ["Dev Tools", /developer|software development/], ["Data & Infra", /data|analytics|cloud|infrastructure|internet/],
  ["SaaS", /software|enterprise|technology|information technology|saas/], ["Consumer", /social|consumer|food|travel|hospitality/],
];
const mapCategory = (ind: string) => { const t = (ind || "").toLowerCase(); for (const [c, re] of CAT) if (re.test(t)) return c; return "SaaS"; };
const mapEmployees = (n: number | null): string | null => !n || n < 1 ? null : n <= 10 ? "1–10" : n <= 50 ? "11–50" : n <= 200 ? "51–200" : n <= 1000 ? "201–1,000" : n <= 5000 ? "1,001–5,000" : "5,000+";
const GRADS: [string, string][] = [["#0eb6a6","#37b6ff"],["#22c9a0","#37b6ff"],["#37b6ff","#0eb6a6"],["#ff6b8b","#ff8a5c"],["#ffb638","#ff8a5c"],["#8fd93a","#22c9a0"],["#37b6ff","#8fd93a"],["#0a8f93","#37b6ff"],["#ff8a5c","#ffb638"],["#22c9a0","#8fd93a"],["#ff6b8b","#0eb6a6"],["#37b6ff","#22c9a0"]];
function gradientFor(name: string): string { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; const [a, b] = GRADS[h % GRADS.length]; return `linear-gradient(135deg,${a},${b})`; }

function placeholders(rows: number, cols: number, suffix = ""): string {
  const out: string[] = []; let n = 0;
  for (let r = 0; r < rows; r++) out.push(`(${Array.from({ length: cols }, () => `$${++n}`).join(",")}${suffix})`);
  return out.join(",");
}

async function main() {
  console.log("Fetching Wikipedia unicorn list …");
  const htmlRes = await fetch("https://en.wikipedia.org/w/api.php?action=parse&page=List%20of%20unicorn%20startup%20companies&prop=text&format=json&formatversion=2", { headers: { "User-Agent": UA } });
  const html: string = (await htmlRes.json()).parse.text;
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const a = /<a href="\/wiki\/([^":#][^"]*)"/.exec(row);
    if (!a) continue;
    const title = decodeURIComponent(a[1]).replace(/_/g, " ").trim();
    if (seen.has(title.toLowerCase()) || COUNTRIES.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    titles.push(title);
  }
  console.log(`candidate companies: ${titles.length}`);

  // Resolve website + facts + description from Wikidata (POST, batched).
  const wd = new Map<string, any>();
  for (let i = 0; i < titles.length; i += 120) {
    const chunk = titles.slice(i, i + 120);
    const values = chunk.map((t) => `<https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_")).replace(/%2F/g, "/")}>`).join(" ");
    // Arena500 eligibility, enforced at the source: private (not on any stock
    // exchange, P414), alive (no dissolution date, P576), and an actual company
    // (not a human Q5 or a country Q6256). This keeps public/exited/dead companies
    // and bad parses out — the Wikipedia unicorn list is historical and includes
    // plenty of since-IPO'd / since-dead companies.
    const q = `SELECT ?article ?website ?countryLabel ?industryLabel ?inception ?employees ?cDescription WHERE {
      VALUES ?article { ${values} } ?article schema:about ?c .
      MINUS { ?c wdt:P414 [] } MINUS { ?c wdt:P576 [] }
      MINUS { ?c wdt:P31 wd:Q5 } MINUS { ?c wdt:P31 wd:Q6256 }
      OPTIONAL { ?c wdt:P856 ?website } OPTIONAL { ?c wdt:P17 ?country }
      OPTIONAL { ?c wdt:P452 ?industry } OPTIONAL { ?c wdt:P571 ?inception } OPTIONAL { ?c wdt:P1128 ?employees }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } }`;
    const res = await fetch("https://query.wikidata.org/sparql", { method: "POST", headers: { "User-Agent": UA, Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" }, body: "query=" + encodeURIComponent(q) });
    if (!res.ok) { console.error("wd batch failed", res.status); continue; }
    for (const b of (await res.json()).results.bindings) {
      const art = decodeURIComponent(b.article.value.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " ").toLowerCase();
      const e = wd.get(art) ?? {};
      if (b.website && !e.website) e.website = b.website.value;
      if (b.countryLabel && !e.country) e.country = b.countryLabel.value;
      if (b.industryLabel && !e.industry) e.industry = b.industryLabel.value;
      if (b.inception && !e.inception) e.inception = Number(b.inception.value.slice(0, 4));
      if (b.employees && !e.employees) e.employees = Number(b.employees.value);
      if (b.cDescription && !e.desc) e.desc = b.cDescription.value;
      wd.set(art, e);
    }
    process.stdout.write(`  resolved ${Math.min(i + 120, titles.length)}/${titles.length}\r`);
  }
  console.log("");

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Dedupe against the WHOLE DB by domain AND name (any lifecycle) — this catches
    // companies that are already present as graduated/public (e.g. Duolingo,
    // Freshworks) even when Wikidata's stock-exchange data is missing, so a public
    // company can't sneak back in as an "active" unicorn.
    const { rows: existing } = await client.query<{ website: string; name: string }>("select website, name from companies");
    const have = new Set(existing.map((r) => bareDomain(r.website)));
    const haveName = new Set(existing.map((r) => r.name.toLowerCase()));
    const domSeen = new Set<string>();
    const rows = titles.map((t) => ({ name: cleanName(t), ...(wd.get(t.toLowerCase()) ?? {}) }))
      .filter((u: any) => {
        const d = bareDomain(u.website || "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return false;
        if (isGov(d) || isMedia(d) || COUNTRIES.has(u.name.toLowerCase()) || EXITED.has(u.name.toLowerCase())) return false;
        // Startup-era floor: a "unicorn" founded before 2005 is almost always a
        // long-since-exited company (LinkedIn, MySQL, Skyscanner…) that Wikidata's
        // exit data missed, or an old non-startup. Unknown founding years are kept
        // (most are genuinely recent unicorns Wikidata just lacks an inception for).
        if (u.inception && u.inception < 2005) return false;
        if (have.has(d) || domSeen.has(d) || haveName.has(u.name.toLowerCase())) return false;
        domSeen.add(d);
        return true;
      });
    console.log(`net-new unicorns to import: ${rows.length}`);
    const regionDist = new Map<string, number>();
    for (const u of rows) regionDist.set(mapRegion(u.country), (regionDist.get(mapRegion(u.country)) ?? 0) + 1);
    console.log("by region:", [...regionDist.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join("  "));
    console.log("sample:", rows.slice(0, 15).map((u: any) => u.name).join(", "));
    if (DRY) { console.log("\n--dry: no writes."); return; }
    if (!rows.length) return;

    const CHUNK = 400;
    let ins = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      const cp = batch.flatMap((u: any) => {
        const cat = mapCategory(u.industry), region = mapRegion(u.country);
        const blurb = (u.desc && u.desc.length < 200 ? u.desc : `${region} unicorn${u.industry ? ` · ${u.industry}` : ""}`).slice(0, 200);
        return [u.name, bareDomain(u.website), cat, region, "Growth", blurb || u.name, gradientFor(u.name), 3,
          null, u.desc && u.desc.length >= 40 ? u.desc.slice(0, 700) : null, u.inception ?? null, u.country ?? null,
          mapEmployees(u.employees ?? null), null, null, null, u.industry ? [u.industry] : null, null, "active", null, null, "unicorn"];
      });
      const { rows: got } = await client.query<{ id: number }>(
        `insert into companies (name, website, category, region, stage, blurb, gradient, prominence,
           logo_url, description, founded_year, headquarters, employees, total_funding, valuation, founders,
           tags, links, lifecycle, exited_at, exit_note, source, status)
         values ${placeholders(batch.length, 22, ", 'live'")} returning id`, cp);
      const rp: unknown[] = [];
      got.forEach((r) => { const base = 1500 + 8 + Math.floor(Math.random() * 20) - 10; for (const qk of DIMENSIONS) rp.push(r.id, qk, base, 0, 0, base); });
      await client.query(`insert into ratings (company_id, dimension, elo, games, week_movement, season_start) values ${placeholders(got.length * 3, 6)}`, rp);
      ins += got.length;
      console.log(`  inserted ${ins}/${rows.length}`);
    }
    console.log(`\n✓ Imported ${ins} unicorns (+${ins * 3} ratings). Run 'npm run db:rebuild-arena' to reconstitute.`);
  } finally { await client.end(); }
}
main().catch((e) => { console.error("Import failed:", e); process.exit(1); });
