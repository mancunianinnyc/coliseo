// Non-destructive pre-launch reset. Unlike db:reset-test-data (which TRUNCATEs
// and re-seeds companies — wiping any *submitted* companies not in the seed
// file), this clears only the ACTIVITY (votes, profiles/streaks, obscurity
// signals, revisions) and resets every company's ratings back to their seed
// baseline. Companies themselves — including approved submissions and any
// hand-fixed data — are preserved.
//
// Use this to give a clean leaderboard before a beta/launch without losing the
// current company set:
//   npm run db:reset-activity
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import { buildCompanies } from "../lib/seed";
import type { QKey } from "../lib/types";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL — copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const DIMENSIONS: QKey[] = ["V", "G", "D"];
const ACTIVITY_TABLES = ["votes", "profiles", "company_unknowns", "revisions"] as const;

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("begin");

    // 1. Clear all user activity.
    for (const t of ACTIVITY_TABLES) {
      const { rowCount } = await client.query(`delete from ${t}`);
      console.log(`  cleared ${t}: ${rowCount} rows`);
    }

    // 2. Reset every rating to a neutral baseline (covers submitted companies
    //    like Somos that aren't in the seed — they settle at 1500).
    await client.query(
      `update ratings set elo = 1500, games = 0, week_movement = 0, season_start = 1500`,
    );

    // 3. Restore the seed's prominence-based starting Elo for seed companies,
    //    matched by name.
    const seed = buildCompanies();
    let seededRows = 0;
    for (const c of seed) {
      for (const qk of DIMENSIONS) {
        const elo = c.ratings[qk].elo;
        const { rowCount } = await client.query(
          `update ratings r
             set elo = $1, season_start = $1
             from companies co
            where co.id = r.company_id and co.name = $2 and r.dimension = $3`,
          [elo, c.name, qk],
        );
        seededRows += rowCount ?? 0;
      }
    }

    const { rows: counts } = await client.query(
      `select
         (select count(*)::int from companies) as companies,
         (select count(*)::int from ratings)   as ratings,
         (select count(*)::int from votes)     as votes,
         (select count(*)::int from profiles)  as profiles`,
    );
    await client.query("commit");
    console.log(`  restored seed Elo on ${seededRows} rating rows`);
    console.log(`\n✓ Clean slate. ${JSON.stringify(counts[0])}`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
