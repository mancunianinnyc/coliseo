// Applies supabase/schema.sql to a real Supabase project via a direct
// Postgres connection (the postgres role is a superuser, so this runs the
// DDL + RLS policies without needing the dashboard SQL editor).
//
//   npm run db:apply-schema
import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL.\nCopy .env.example to .env.local and fill in the direct Postgres connection string.",
  );
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const sql = readFileSync(path.join(__dirname, "../supabase/schema.sql"), "utf8");
    await client.query(sql);
    console.log("✓ schema.sql applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Failed to apply schema:", err.message);
  process.exit(1);
});
