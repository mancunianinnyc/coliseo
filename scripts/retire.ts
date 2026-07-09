// Graduate a company out of the arena (it went public, was acquired, or shut
// down). This applies a one-off LIVE change to the database. To make it
// durable across re-seeds, also add the company to the EXITS map in
// lib/companies.data.ts.
//
//   npm run db:retire -- "Figma" public "IPO 2025 · NYSE: FIG"
//   npm run db:retire -- "Acme" dead "Shut down, 2026"
//   npm run db:retire -- "Acme" active            (un-retire / bring back)
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
const [name, lifecycle, note] = process.argv.slice(2);
const VALID = ["active", "public", "acquired", "dead"];

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL (set it in .env.local).");
  process.exit(1);
}
if (!name || !lifecycle || !VALID.includes(lifecycle)) {
  console.error(`Usage: npm run db:retire -- "<Company>" <${VALID.join("|")}> ["note"]`);
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const active = lifecycle === "active";
    const { rowCount } = await client.query(
      `update companies
          set lifecycle = $2,
              exit_note = $3,
              exited_at = case when $2 = 'active' then null else current_date end
        where name = $1`,
      [name, lifecycle, active ? null : (note ?? null)],
    );
    if (rowCount === 0) console.error(`No company named "${name}" found.`);
    else console.log(`✓ ${name} → ${lifecycle}${note && !active ? ` (${note})` : ""}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Retire failed:", err.message);
  process.exit(1);
});
