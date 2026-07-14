import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { COMPANY_COLUMNS, mapCompanyRow, type CompanyRowWithRatings } from "@/lib/loadCompanies";

// Discover pool — random companies from the FULL database (everything the
// Arena500 doesn't surface: ~4,000 live long-tail startups). The client draws 3
// spotlights per visit from this pool, so every return trip shuffles without
// every visitor hitting the DB: like /api/arena, the route is ISR-cached and
// re-sampled server-side every 5 minutes.
//
// Two buckets so a draw can anchor on something semi-recognizable:
//  - notable: random rows from the ~600 highest-notability companies OUTSIDE the
//    arena (the promotion zone — next in line for the Arena500)
//  - wild:    uniform random over the whole non-arena long tail (true deep cuts)
export const revalidate = 300;

const NOTABLE_POOL = 8;
const WILD_POOL = 16;
const NOTABLE_WINDOW = 600;

const empty = { notable: [], wild: [], total: 0 };

export async function GET() {
  if (!supabase) return NextResponse.json(empty);
  try {
    const { count, error: countErr } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("status", "live")
      .eq("lifecycle", "active")
      .eq("arena_eligible", false);
    if (countErr || !count) return NextResponse.json(empty);

    // PostgREST has no `order by random()`, so randomness = random offsets into
    // a stable ordering, one row each. ~24 single-row queries per 5-minute
    // revalidation is nothing.
    const offsets = (n: number, max: number) => {
      const s = new Set<number>();
      while (s.size < Math.min(n, max)) s.add(Math.floor(Math.random() * max));
      return [...s];
    };
    const rowAt = async (k: number, notable: boolean) => {
      let q = supabase!
        .from("companies")
        .select(COMPANY_COLUMNS)
        .eq("status", "live")
        .eq("lifecycle", "active")
        .eq("arena_eligible", false);
      q = notable
        ? q.order("notability", { ascending: false }).order("id")
        : q.order("id");
      const { data, error } = await q.range(k, k);
      if (error || !data?.length) return null;
      return mapCompanyRow({ ...(data[0] as unknown as Omit<CompanyRowWithRatings, "ratings">), ratings: [] });
    };

    const [notable, wild] = await Promise.all([
      Promise.all(offsets(NOTABLE_POOL, Math.min(NOTABLE_WINDOW, count)).map((k) => rowAt(k, true))),
      Promise.all(offsets(WILD_POOL, count).map((k) => rowAt(k, false))),
    ]);
    return NextResponse.json({
      notable: notable.filter(Boolean),
      wild: wild.filter(Boolean),
      total: count,
    });
  } catch (err) {
    console.error("Discover pool failed:", err);
    return NextResponse.json(empty);
  }
}
