// Core domain types for ConvictionELO.

export type QKey = "V" | "G" | "D"; // Value | Growth | Workplace

export interface Rating {
  elo: number;
  games: number; // matchups played on this dimension (drives K-factor & confidence)
  weekMovement: number; // Elo change this cycle (for table movement arrows)
  seasonStart: number;
}

export type Stage = "Growth" | "Late";

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
