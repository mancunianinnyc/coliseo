// One-off DB seed: reads the seed companies from lib/seed.ts and bulk-inserts
// them (+ their per-dimension ratings) into a real Supabase project via a
// direct Postgres connection (the postgres role bypasses RLS as superuser,
// so no service-role key is needed). Run against a fresh/empty project after
// `npm run db:apply-schema`:
//
//   npm run db:seed
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import { buildCompanies } from "../lib/seed";
import type { QKey } from "../lib/types";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL.\nCopy .env.example to .env.local and fill in the direct Postgres connection string.",
  );
  process.exit(1);
}

const DIMENSIONS: QKey[] = ["V", "G", "D"];

// Build a "($1,$2,...),($n,...)" placeholder string for a bulk insert.
function placeholders(rowCount: number, colsPerRow: number, suffix = ""): string {
  const rows: string[] = [];
  let n = 0;
  for (let r = 0; r < rowCount; r++) {
    const cols = Array.from({ length: colsPerRow }, () => `$${++n}`);
    rows.push(`(${cols.join(",")}${suffix})`);
  }
  return rows.join(",\n");
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const companies = buildCompanies();

    // ---- bulk insert companies (17 params/row + constant status) ----
    const companyParams = companies.flatMap((c) => [
      c.name, c.website, c.category, c.region, c.stage, c.blurb, c.gradient,
      c.logoUrl ?? null, c.description ?? null, c.foundedYear ?? null,
      c.headquarters ?? null, c.employees ?? null, c.totalFunding ?? null,
      c.valuation ?? null, c.founders ?? null, c.tags ?? null,
      c.links ? JSON.stringify(c.links) : null,
    ]);
    const { rows: inserted } = await client.query(
      `insert into companies
         (name, website, category, region, stage, blurb, gradient,
          logo_url, description, founded_year, headquarters, employees,
          total_funding, valuation, founders, tags, links, status)
       values ${placeholders(companies.length, 17, ", 'live'")}
       returning id`,
      companyParams,
    );

    // ---- bulk insert ratings (ids come back in insertion order) ----
    const ratingParams: unknown[] = [];
    inserted.forEach((row: { id: number }, i: number) => {
      for (const qk of DIMENSIONS) {
        const r = companies[i].ratings[qk];
        ratingParams.push(row.id, qk, r.elo, r.games, r.weekMovement, r.seasonStart);
      }
    });
    await client.query(
      `insert into ratings (company_id, dimension, elo, games, week_movement, season_start)
       values ${placeholders(inserted.length * DIMENSIONS.length, 6)}`,
      ratingParams,
    );

    console.log(`✓ Seeded ${inserted.length} companies + ${inserted.length * 3} ratings.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
