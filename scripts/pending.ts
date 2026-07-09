// Lists company submissions awaiting moderation — every row in `companies` with
// status='pending'. Submissions land here via the server-authoritative
// `submit_company` RPC and stay invisible in the app until an admin flips them to
// 'live'. There is no separate moderation inbox; this is the queue.
//
// Read-only. Used by the daily "check-pending-submissions" scheduled task and
// handy to run by hand:
//   npm run db:pending
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select id, name, website, category, region, blurb,
              submitted_by, created_at
         from companies
        where status = 'pending'
        order by created_at asc`,
    );
    if (rows.length === 0) {
      console.log("PENDING_COUNT=0");
      console.log("No submissions awaiting approval.");
      return;
    }
    console.log(`PENDING_COUNT=${rows.length}`);
    for (const r of rows) {
      const when = new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ");
      const by = r.submitted_by ? String(r.submitted_by).slice(0, 8) : "seed";
      console.log(
        `#${r.id}  ${r.name}  [${r.category} / ${r.region}]  ${r.website}  ` +
          `by=${by}  ${when}Z` +
          (r.blurb ? `\n     "${r.blurb}"` : ""),
      );
    }
    console.log(
      `\nApprove with:  update companies set status='live' where id=<id>;` +
        `\nReject with:   update companies set status='rejected' where id=<id>;`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
