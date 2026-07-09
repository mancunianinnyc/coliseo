import type { Company, QKey, Rating } from "./types";
import { buildCompanies } from "./seed";
import { supabase } from "./supabase";

interface CompanyRow {
  id: number;
  name: string;
  website: string;
  category: string;
  region: string;
  stage: "Growth" | "Late";
  blurb: string | null;
  gradient: string | null;
}

interface RatingRow {
  company_id: number;
  dimension: QKey;
  elo: number;
  games: number;
  week_movement: number;
  season_start: number;
}

const FALLBACK_GRADIENT = "linear-gradient(135deg,#0eb6a6,#37b6ff)";
const emptyRating = (): Rating => ({ elo: 1500, games: 0, weekMovement: 0, seasonStart: 1500 });

// Loads companies + their per-dimension ratings from Supabase. Falls back to the
// in-memory seed (lib/seed.ts) when Supabase isn't configured or the query fails,
// so local dev keeps working without a project wired up.
export async function loadCompanies(): Promise<Company[]> {
  if (!supabase) return buildCompanies();

  const [{ data: companyRows, error: companyErr }, { data: ratingRows, error: ratingErr }] =
    await Promise.all([
      supabase.from("companies").select("id, name, website, category, region, stage, blurb, gradient"),
      supabase.from("ratings").select("company_id, dimension, elo, games, week_movement, season_start"),
    ]);

  if (companyErr || ratingErr || !companyRows) {
    console.error("Supabase load failed, falling back to seed data:", companyErr ?? ratingErr);
    return buildCompanies();
  }

  const ratingsByCompany = new Map<number, Record<QKey, Rating>>();
  for (const r of (ratingRows ?? []) as RatingRow[]) {
    const ratings = ratingsByCompany.get(r.company_id) ?? ({} as Record<QKey, Rating>);
    ratings[r.dimension] = {
      elo: r.elo,
      games: r.games,
      weekMovement: r.week_movement,
      seasonStart: r.season_start,
    };
    ratingsByCompany.set(r.company_id, ratings);
  }

  return (companyRows as CompanyRow[]).map((c) => {
    const ratings = ratingsByCompany.get(c.id) ?? ({} as Record<QKey, Rating>);
    return {
      id: c.id,
      name: c.name,
      website: c.website,
      category: c.category,
      region: c.region,
      stage: c.stage,
      blurb: c.blurb ?? "",
      gradient: c.gradient ?? FALLBACK_GRADIENT,
      ratings: {
        V: ratings.V ?? emptyRating(),
        G: ratings.G ?? emptyRating(),
        D: ratings.D ?? emptyRating(),
      },
    };
  });
}
