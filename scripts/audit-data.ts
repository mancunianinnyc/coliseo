// Data-quality audit for the seed dataset. Two passes:
//   1. Field completeness — which companies are missing profile fields
//      (founded, HQ, funding, founders, description) that make a dossier feel
//      trustworthy.
//   2. Dead links — HTTP-checks each company's website and flags anything that
//      doesn't resolve to a 2xx/3xx (bot-blocked sites may be false positives,
//      so treat this as a review list, not an auto-fix).
//
//   npm run audit:data            # both passes
//   npm run audit:data -- --links # links only (slower)
//   npm run audit:data -- --fields
import { buildCompanies } from "../lib/seed";

const args = process.argv.slice(2);
const doLinks = args.includes("--links") || !args.includes("--fields");
const doFields = args.includes("--fields") || !args.includes("--links");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function checkLink(domain: string): Promise<{ ok: boolean; status: number | string }> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(12000),
    });
    return { ok: res.status < 400, status: res.status };
  } catch (e) {
    return { ok: false, status: (e as Error).name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

async function main() {
  const companies = buildCompanies();
  console.log(`Auditing ${companies.length} companies.\n`);

  if (doFields) {
    const missing: Record<string, string[]> = {
      description: [],
      foundedYear: [],
      headquarters: [],
      totalFunding: [],
      founders: [],
    };
    for (const c of companies) {
      if (!c.description) missing.description.push(c.name);
      if (!c.foundedYear) missing.foundedYear.push(c.name);
      if (!c.headquarters) missing.headquarters.push(c.name);
      if (!c.totalFunding) missing.totalFunding.push(c.name);
      if (!c.founders || c.founders.length === 0) missing.founders.push(c.name);
    }
    console.log("=== FIELD COMPLETENESS (missing count / total) ===");
    for (const [field, list] of Object.entries(missing)) {
      console.log(`  ${field.padEnd(14)} ${list.length} missing`);
    }
    // The ones missing everything are the weakest dossiers.
    const bare = companies.filter(
      (c) => !c.description && !c.foundedYear && !c.headquarters && !c.totalFunding,
    );
    console.log(`\n  ${bare.length} companies have NO enrichment at all:`);
    console.log("   " + bare.map((c) => c.name).join(", "));
    console.log("");
  }

  if (doLinks) {
    console.log("=== DEAD-LINK CHECK (websites that didn't return 2xx/3xx) ===");
    const bad: string[] = [];
    // Small concurrency pool so we don't fire 250 requests at once.
    const POOL = 12;
    let i = 0;
    async function worker() {
      while (i < companies.length) {
        const c = companies[i++];
        const r = await checkLink(c.website);
        if (!r.ok) {
          bad.push(`  ${String(r.status).padEnd(11)} ${c.name} — ${c.website}`);
        }
      }
    }
    await Promise.all(Array.from({ length: POOL }, worker));
    if (bad.length === 0) console.log("  ✓ All websites resolved.");
    else console.log(bad.sort().join("\n"));
    console.log(`\n  ${bad.length} / ${companies.length} flagged (some may be bot-blocks — verify by hand).`);
  }
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
