// Applies an arbitrary .sql file to the Supabase database via the direct
// Postgres (superuser) connection — used for migrations like the cast_vote
// function that shouldn't re-run the whole idempotent-unsafe schema.sql.
//
//   npm run db:apply-sql -- supabase/cast_vote.sql
import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
const file = process.argv[2];

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL (set it in .env.local).");
  process.exit(1);
}
if (!file) {
  console.error("Usage: npm run db:apply-sql -- <path/to/file.sql>");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(path.resolve(process.cwd(), file), "utf8");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`✓ Applied ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Failed to apply SQL:", err.message);
  process.exit(1);
});
