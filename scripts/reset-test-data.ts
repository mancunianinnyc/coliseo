// Clears user-generated TEST data so the project starts clean for a public
// launch: every row in `votes`, `profiles`, and `revisions` is deleted.
//
// It deliberately does NOT touch `companies` or `ratings` — those hold the
// seeded content the app is built on. (Ratings are safe because Elo is applied
// client-side only and never persisted, so votes so far haven't changed them.)
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

// Order matters only if you add cross-table foreign keys later; these three are
// independent today, but we keep a sensible order anyway.
const TABLES = ["revisions", "votes", "profiles"] as const;

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

    for (const t of TABLES) await client.query(`delete from ${t}`);

    console.log("After reset:");
    for (const t of TABLES) console.log(`  ${t}: ${await count(client, t)} rows`);

    console.log("\n✓ Test data cleared. companies + ratings were left untouched.");
    console.log(
      "Note: anonymous auth users may still exist in Supabase Auth — clear them from\n" +
        "the dashboard (Authentication → Users) if you want a completely fresh slate.",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
