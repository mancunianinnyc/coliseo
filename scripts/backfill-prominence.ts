// One-time backfill of companies.prominence on an already-seeded DB, from the
// seed's `p` values (matched by name). New submissions keep the column default
// (2). Idempotent — safe to re-run. Requires supabase/prominence.sql applied
// first (the column must exist).
//
//   npm run db:apply-sql -- supabase/prominence.sql
//   npm run db:backfill-prominence
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import { COMPANIES } from "../lib/companies.data";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL — copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    let updated = 0;
    for (const s of COMPANIES) {
      const { rowCount } = await client.query(
        `update companies set prominence = $1 where name = $2`,
        [s.p, s.n],
      );
      updated += rowCount ?? 0;
    }
    const { rows } = await client.query(
      `select prominence, count(*)::int n from companies group by prominence order by prominence`,
    );
    console.log(`✓ Backfilled prominence on ${updated} companies.`);
    console.log("Distribution:", rows.map((r) => `p${r.prominence}=${r.n}`).join("  "));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
