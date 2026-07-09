import { supabase } from "./supabase";
import type { QKey } from "./types";

// Records that the current voter doesn't know a company well enough to judge it.
// It's not a vote and never affects Elo — it's an obscurity signal (which
// companies aren't known yet) and a future matchmaking input. Fire-and-forget;
// RLS enforces voter_id = auth.uid().
export async function flagUnknown(
  voterId: string,
  companyId: number,
  dimension: QKey,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("company_unknowns")
    .insert({ voter_id: voterId, company_id: companyId, dimension });
  if (error) console.error("Unknown flag failed:", error.message);
}
