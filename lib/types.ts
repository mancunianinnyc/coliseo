// Core domain types for Coliseo.

export type QKey = "V" | "G" | "D"; // Conviction | Momentum | Talent

export interface Rating {
  elo: number;
  games: number; // matchups played on this dimension (drives K-factor & confidence)
  weekMovement: number; // Elo change this cycle (for table movement arrows)
  seasonStart: number;
}

export type Stage = "Early" | "Growth" | "Late";

// Lifecycle: "active" companies are in the arena; the rest have "graduated"
// (left the arena) and are archived — kept for their profile + history but
// excluded from voting and the live rankings.
export type Lifecycle = "active" | "public" | "acquired" | "dead";

export interface CompanyLinks {
  x?: string; // twitter/x handle URL
  linkedin?: string;
  crunchbase?: string;
}

export interface Company {
  id: number;
  name: string;
  website: string; // e.g. "openai.com" — used for logo + link
  category: string; // AI Infra | Fintech | Dev Tools | Consumer | SaaS | Hardware | Health
  region: string; // US | Europe | APAC | Israel | LatAm | Other
  stage: Stage;
  blurb: string;
  gradient: string; // CSS gradient fallback for the logo tile
  ratings: Record<QKey, Rating>;
  // Fame tier 1–5 (5 = household name). Drives peer matchmaking + the new-user
  // warm-up ramp so voters see companies at their own recognition level.
  prominence: number;

  // ---- Crunchbase-style profile fields (all optional; may be unset for
  //      freshly submitted companies until enriched/verified) ----
  logoUrl?: string | null; // self-hosted /logos/*.png or an external image URL
  description?: string; // 1–3 sentence overview (longer than blurb)
  foundedYear?: number | null;
  headquarters?: string; // "San Francisco, USA"
  employees?: string; // range, e.g. "5,001–10,000"
  totalFunding?: string; // e.g. "$17.9B"
  valuation?: string; // latest known, e.g. "$157B"
  founders?: string[];
  tags?: string[];
  links?: CompanyLinks;

  // ---- Lifecycle (arena eligibility) ----
  lifecycle?: Lifecycle; // defaults to "active"
  exitedAt?: string | null; // ISO date the company graduated, if any
  exitNote?: string | null; // e.g. "IPO'd 2025 · NYSE: FIG" or "Acquired by Google"
}

// One row per head-to-head vote. This log is append-only and never deleted —
// it is what lets us later compute splits and re-estimate with Bradley–Terry / TrueSkill.
export interface Vote {
  id?: string;
  voterId: string;
  companyA: number;
  companyB: number;
  dimension: QKey;
  winner: number; // company id
  voterTier: string;
  createdAt: string; // ISO
}
