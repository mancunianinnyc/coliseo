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
