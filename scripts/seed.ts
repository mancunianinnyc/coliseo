// One-off DB seed: reads the 18 seed startups from lib/seed.ts and inserts
// them (+ their per-dimension ratings) into a real Supabase project via a
// direct Postgres connection (the postgres role bypasses RLS as superuser,
// so no service-role key is needed). Run once against a fresh project after
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

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const companies = buildCompanies();

    for (const c of companies) {
      const { rows } = await client.query(
        `insert into companies (name, website, category, region, stage, blurb, gradient, status)
         values ($1,$2,$3,$4,$5,$6,$7,'live')
         returning id`,
        [c.name, c.website, c.category, c.region, c.stage, c.blurb, c.gradient],
      );
      const companyId = rows[0].id;

      for (const qk of DIMENSIONS) {
        const r = c.ratings[qk];
        await client.query(
          `insert into ratings (company_id, dimension, elo, games, week_movement, season_start)
           values ($1,$2,$3,$4,$5,$6)`,
          [companyId, qk, r.elo, r.games, r.weekMovement, r.seasonStart],
        );
      }

      console.log(`✓ ${c.name} (id ${companyId})`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
