// Full reset to the seeded launch state. Wipes ALL app data — votes, profiles,
// revisions, ratings, and companies — so no trace of test activity remains
// (including the Elo drift that test votes caused in `ratings`, now that votes
// are applied server-side). The npm script chains `db:seed` afterwards to
// re-insert the seed companies + ratings from lib/seed.ts.
//
// Run once, right before you open the app to the public:
//   npm run db:reset-test-data
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL.\nCopy .env.example to .env.local and fill in the direct Postgres connection string.",
  );
  process.exit(1);
}

// All app tables. TRUNCATE ... CASCADE clears them together regardless of the
// foreign keys between them; RESTART IDENTITY resets company ids back to 1 so a
// re-seed is identical to a first seed. auth.users is NOT touched here — clear
// anonymous test users from the Supabase dashboard if you want those gone too.
const TABLES = ["votes", "profiles", "revisions", "ratings", "companies"] as const;

async function count(client: Client, table: string): Promise<number> {
  const { rows } = await client.query(`select count(*)::int as n from ${table}`);
  return rows[0].n;
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log("Before reset:");
    for (const t of TABLES) console.log(`  ${t}: ${await count(client, t)} rows`);

    await client.query(`truncate ${TABLES.join(", ")} restart identity cascade`);

    console.log("After reset (empty — re-seed runs next):");
    for (const t of TABLES) console.log(`  ${t}: ${await count(client, t)} rows`);
    console.log("\n✓ All test data cleared. `db:seed` will now restore the seed companies + ratings.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
