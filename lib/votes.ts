import { supabase } from "./supabase";
import type { QKey } from "./types";

export interface VoteInput {
  voterId: string;
  companyA: number;
  companyB: number;
  dimension: QKey;
  winner: number; // company id
  voterTier: string; // tier name at time of vote (for later split analysis)
}

// Appends one row to the immutable `votes` comparison log. This is the source
// of truth the spec wants captured from day one (§7) — every head-to-head is
// stored and never mutated, enabling later re-estimation (Bradley–Terry /
// TrueSkill) and vote-split analysis.
//
// Clients only INSERT here; RLS enforces voter_id = auth.uid(). The actual Elo
// update to `ratings` is deliberately NOT done here — that belongs in a
// SECURITY DEFINER server function so ratings can't be forged (CLAUDE.md).
//
// TODO(server): enforce the 3-picks-per-day-per-voter limit server-side; right
// now RLS permits unlimited inserts by a given identity.
export async function recordVote(v: VoteInput): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("votes").insert({
    voter_id: v.voterId,
    company_a: v.companyA,
    company_b: v.companyB,
    dimension: v.dimension,
    winner: v.winner,
    voter_tier: v.voterTier,
  });
  if (error) console.error("Vote insert failed:", error.message);
}
