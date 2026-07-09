import type { Company, QKey } from "./types";

// ---- Credibility tiers (streak -> vote weight) ----
export const TIERS = [
  { min: 0, name: "Rookie", mult: 1.0, color: "#7b7893" },
  { min: 2, name: "Regular", mult: 1.08, color: "#37b6ff" },
  { min: 4, name: "Sharp", mult: 1.15, color: "#22c9a0" },
  { min: 7, name: "Analyst", mult: 1.22, color: "#0a8f93" },
  { min: 14, name: "Oracle", mult: 1.28, color: "#ff8a5c" },
  { min: 30, name: "Legend", mult: 1.35, color: "#ff6b8b" },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierFor(streak: number): Tier {
  let t: Tier = TIERS[0];
  for (const x of TIERS) if (streak >= x.min) t = x;
  return t;
}

// Decay one tier on a missed day (drops streak to the floor of the tier below).
export function decayedStreak(streak: number): number {
  const idx = TIERS.indexOf(tierFor(streak));
  return idx > 0 ? TIERS[idx - 1].min : 0;
}

// ---- Elo ----
export function expected(a: Company, b: Company, qk: QKey): number {
  return 1 / (1 + Math.pow(10, (b.ratings[qk].elo - a.ratings[qk].elo) / 400));
}

export function kFactor(c: Company, qk: QKey): number {
  const g = c.ratings[qk].games;
  if (g < 10) return 48; // provisional
  return c.stage === "Late" ? 20 : 32; // stage-aware damping
}

export function confidence(c: Company, qk: QKey): "Provisional" | "Established" {
  return c.ratings[qk].games >= 25 ? "Established" : "Provisional";
}

/**
 * Compute the winner/loser Elo deltas for a single dimension WITHOUT mutating
 * anything. Pure — safe to call for a provisional "what would this pick do?"
 * preview that the user can still change. voteWeight comes from the voter's
 * credibility tier (1.0–1.35).
 */
export function eloDeltas(
  winner: Company,
  loser: Company,
  qk: QKey,
  voteWeight = 1,
): { dw: number; dl: number } {
  const ew = expected(winner, loser, qk);
  const dw = Math.round(kFactor(winner, qk) * (1 - ew) * voteWeight);
  const dl = Math.round(kFactor(loser, qk) * (0 - (1 - ew)) * voteWeight);
  return { dw, dl };
}

/**
 * Apply a result to a single dimension's Elo. Mutates the two companies.
 * Returns the winner/loser deltas.
 */
export function applyElo(
  winner: Company,
  loser: Company,
  qk: QKey,
  voteWeight = 1,
): { dw: number; dl: number } {
  const { dw, dl } = eloDeltas(winner, loser, qk, voteWeight);
  winner.ratings[qk].elo += dw;
  loser.ratings[qk].elo += dl;
  winner.ratings[qk].games += 1;
  loser.ratings[qk].games += 1;
  winner.ratings[qk].weekMovement += dw;
  loser.ratings[qk].weekMovement += dl;
  return { dw, dl };
}

// ---- Composite (equal-weighted Overall) ----
export function composite(c: Company): number {
  return Math.round(
    (c.ratings.V.elo + c.ratings.G.elo + c.ratings.D.elo) / 3,
  );
}

export function compositeMovement(c: Company): number {
  return Math.round(
    (c.ratings.V.weekMovement +
      c.ratings.G.weekMovement +
      c.ratings.D.weekMovement) /
      3,
  );
}

// eloOf handles the "ALL" (Overall) pseudo-dimension used by leaderboards.
export function eloOf(c: Company, qk: QKey | "ALL"): number {
  return qk === "ALL" ? composite(c) : c.ratings[qk].elo;
}
