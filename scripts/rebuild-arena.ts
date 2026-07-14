// Reconstitute the Arena500: score every active company by notability, mark the
// top N as arena_eligible, and re-derive prominence within the arena so the
// new-user warm-up has a real gradient. Re-run after each import — companies get
// promoted in / relegated out as their scores move (S&P-500-style).
//
//   npm run db:rebuild-arena             # rebuild at the default size (500)
//   npm run db:rebuild-arena -- 400      # custom size
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const SIZE = Number(process.argv[2]) || 500;
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL (set it in .env.local).");
  process.exit(1);
}

// Not startups at all — YC funds a handful of nonprofits (they arrive via the
// yc-oss import with strong signals and can score into the arena). The arena is
// for private venture-backed startups only; keep these permanently out. They
// stay in the DB (Discover/profiles), just never arena_eligible. Append-only.
const NOT_STARTUPS = new Set(["aclu", "noora health"]);

interface Row {
  id: number;
  prominence: number | null;
  employees: string | null;
  valuation: string | null;
  total_funding: string | null;
  source: string | null;
  name: string;
}

// Notability from the signals we actually have. Hand-assigned prominence (the
// curated seed) dominates; team size is the best "past Series B" proxy for the
// bulk-imported long tail; known valuation/funding are strong bonuses.
function notability(c: Row): number {
  let s = (c.prominence ?? 2) * 18;
  const nums = (c.employees ?? "").match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  const empMin = nums.length ? Math.min(...nums) : 0;
  if (empMin >= 5000) s += 22;
  else if (empMin >= 1000) s += 16;
  else if (empMin >= 200) s += 10;
  else if (empMin >= 50) s += 4;
  if (c.valuation) s += 12;
  if (c.total_funding) s += 6;
  if (c.source === "seed" || c.source == null) s += 8; // curated set
  return s;
}

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(await import("node:fs").then((fs) => fs.readFileSync(path.join(__dirname, "../supabase/arena.sql"), "utf8")));

    const { rows } = await client.query<Row>(
      "select id, prominence, employees, valuation, total_funding, source, name from companies where lifecycle = 'active'",
    );
    const scored = rows
      .filter((c) => !NOT_STARTUPS.has(c.name.toLowerCase()))
      .map((c) => ({ id: c.id, name: c.name, notab: notability(c) }))
      .sort((a, b) => b.notab - a.notab || a.name.localeCompare(b.name));

    const arena = new Set(scored.slice(0, SIZE).map((c) => c.id));
    // Set notability + arena membership only. IMPORTANT: prominence is a STABLE,
    // source-assigned signal (the notability score is built from it) and must NOT
    // be mutated here — re-deriving it from arena rank creates a feedback loop that
    // churns and degrades the tail on every rebuild. Warm-up already has a gradient
    // from the source prominences (seed 1–5, unicorn 3, YC 2/top-4).
    const ids: number[] = [], notabs: number[] = [], arenaFlags: boolean[] = [];
    scored.forEach((c) => {
      ids.push(c.id);
      notabs.push(c.notab);
      arenaFlags.push(arena.has(c.id));
    });

    await client.query("begin");
    await client.query("update companies set arena_eligible = false where arena_eligible");
    await client.query(
      `update companies c
          set notability = t.notab, arena_eligible = t.arena
         from (select unnest($1::int[]) as id, unnest($2::int[]) as notab,
                      unnest($3::boolean[]) as arena) t
        where c.id = t.id`,
      [ids, notabs, arenaFlags],
    );
    await client.query("commit");

    const cut = scored[SIZE - 1];
    console.log(`✓ Arena rebuilt: ${arena.size} eligible of ${rows.length} active.`);
    console.log(`  score range in arena: ${scored[0].notab} (top) … ${cut.notab} (#${SIZE}, "${cut.name}")`);
    console.log(`  top 12: ${scored.slice(0, 12).map((c) => c.name).join(", ")}`);
    console.log(`  near the cut (#${SIZE - 3}–#${SIZE + 3}): ${scored.slice(SIZE - 4, SIZE + 3).map((c, i) => `${SIZE - 3 + i}:${c.name}`).join(", ")}`);
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error("Rebuild failed:", e); process.exit(1); });
