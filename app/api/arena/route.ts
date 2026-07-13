import { NextResponse } from "next/server";
import { fetchArenaCompanies } from "@/lib/loadCompanies";

// The Arena500, served from Vercel's cache instead of straight from Supabase.
// Every visitor used to pull ~500 companies + ratings directly from PostgREST
// on mount — unbounded DB reads under a traffic spike. With ISR (revalidate)
// the database sees roughly one read per minute regardless of traffic, and a
// leaderboard that's ≤60s stale is invisible to users. (Per-user reads — vote
// counts, profile — stay direct; they're cheap HEAD counts.)
export const revalidate = 60;

export async function GET() {
  const companies = await fetchArenaCompanies();
  if (!companies) {
    // Supabase not configured (or query failed) — the client falls back to
    // seed data. Short max-age so recovery isn't stuck behind a cached error.
    return NextResponse.json(
      { error: "arena unavailable" },
      { status: 503, headers: { "Cache-Control": "public, max-age=15" } },
    );
  }
  return NextResponse.json(companies);
}
