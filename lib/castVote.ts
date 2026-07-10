import { supabase } from "./supabase";
import type { QKey } from "./types";

export interface CastVoteInput {
  companyA: number;
  companyB: number;
  dimension: QKey;
  winner: number; // company id
}

// Authoritative server result: the Elo the DB actually applied.
export interface CastVoteResult {
  winner: number;
  loser: number;
  dimension: QKey;
  dw: number;
  dl: number;
  winnerElo: number;
  loserElo: number;
}

export type CastVoteOutcome =
  | { ok: true; result: CastVoteResult }
  | { ok: false; error: string; alreadyVoted: boolean };

// How many of today's picks the user has already cast (0–3). Mirrors the
// server's daily boundary in `cast_vote` (date_trunc('day', now()), i.e. UTC)
// so the client agrees with the one-pick-per-dimension-per-day rule and a page
// reload can't reset the daily count. RLS ("read own votes") scopes this to the
// caller; the userId filter is belt-and-suspenders.
export async function votesTodayCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const startOfUtcDay = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
  const { count, error } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("voter_id", userId)
    .gte("created_at", startOfUtcDay);
  if (error) {
    console.error("votesTodayCount failed:", error.message);
    return 0;
  }
  return Math.min(count ?? 0, 3);
}

// Total votes this user has ever cast — drives the new-user warm-up ramp (early
// matchups skew to recognizable companies, then broaden). RLS ("read own votes")
// scopes this to the caller.
export async function votesLifetimeCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("voter_id", userId);
  if (error) {
    console.error("votesLifetimeCount failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

// Calls the server-authoritative `cast_vote` SECURITY DEFINER function. The
// database — not the client — validates the pick, enforces one vote per
// dimension per day, applies the Elo change to `ratings`, and records the vote.
// The client only reports the pick and displays whatever the server returns.
export async function castVote(input: CastVoteInput): Promise<CastVoteOutcome> {
  if (!supabase) return { ok: false, error: "no-backend", alreadyVoted: false };

  const { data, error } = await supabase.rpc("cast_vote", {
    p_company_a: input.companyA,
    p_company_b: input.companyB,
    p_dimension: input.dimension,
    p_winner: input.winner,
  });

  if (error) {
    const alreadyVoted = error.message.toLowerCase().includes("already voted");
    return { ok: false, error: error.message, alreadyVoted };
  }
  return { ok: true, result: data as CastVoteResult };
}
