import type { Company, CompanyLinks, QKey, Rating } from "./types";
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
  prominence: number | null;
  logo_url: string | null;
  description: string | null;
  founded_year: number | null;
  headquarters: string | null;
  employees: string | null;
  total_funding: string | null;
  valuation: string | null;
  founders: string[] | null;
  tags: string[] | null;
  links: CompanyLinks | null;
  lifecycle: Company["lifecycle"];
  exited_at: string | null;
  exit_note: string | null;
}

const COMPANY_COLUMNS =
  "id, name, website, category, region, stage, blurb, gradient, prominence, logo_url, description, founded_year, headquarters, employees, total_funding, valuation, founders, tags, links, lifecycle, exited_at, exit_note";

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
      supabase.from("companies").select(COMPANY_COLUMNS),
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
      prominence: c.prominence ?? 2,
      ratings: {
        V: ratings.V ?? emptyRating(),
        G: ratings.G ?? emptyRating(),
        D: ratings.D ?? emptyRating(),
      },
      logoUrl: c.logo_url,
      description: c.description ?? undefined,
      foundedYear: c.founded_year,
      headquarters: c.headquarters ?? undefined,
      employees: c.employees ?? undefined,
      totalFunding: c.total_funding ?? undefined,
      valuation: c.valuation ?? undefined,
      founders: c.founders ?? undefined,
      tags: c.tags ?? undefined,
      links: c.links ?? undefined,
      lifecycle: c.lifecycle ?? "active",
      exitedAt: c.exited_at,
      exitNote: c.exit_note,
    };
  });
}
