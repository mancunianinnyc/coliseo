import type { Company, CompanyLinks, QKey, Rating, Stage } from "./types";
import { buildCompanies } from "./seed";
import { supabase } from "./supabase";

interface CompanyRow {
  id: number;
  name: string;
  website: string;
  category: string;
  region: string;
  stage: Stage;
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

interface CompanyRowWithRatings extends CompanyRow {
  ratings: Omit<RatingRow, "company_id">[];
}

const FALLBACK_GRADIENT = "linear-gradient(135deg,#0eb6a6,#37b6ff)";
const emptyRating = (): Rating => ({ elo: 1500, games: 0, weekMovement: 0, seasonStart: 1500 });

// The app surfaces only the Arena500 (arena_eligible = true) — a fixed ~500, so
// even as the underlying DB grows into the tens of thousands this stays a small,
// fast load. Ratings are embedded (PostgREST nests the related rows) so there's no
// separate ratings query + 1000-row cap to juggle. Non-arena companies are loaded
// on demand elsewhere (Discover / profile pages). Still page with .range() in case
// the arena size is ever raised past 1000.
const PAGE = 1000;
const RATINGS_EMBED = "ratings(dimension, elo, games, week_movement, season_start)";
async function fetchArena(): Promise<CompanyRowWithRatings[]> {
  const out: CompanyRowWithRatings[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase!
      .from("companies")
      .select(`${COMPANY_COLUMNS}, ${RATINGS_EMBED}`)
      .eq("arena_eligible", true)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as CompanyRowWithRatings[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// Fetches + maps the Arena500 straight from Supabase. Used SERVER-SIDE by the
// cached /api/arena route (and as the underlying implementation everywhere).
// Returns null when Supabase isn't configured or the query fails — callers
// decide their own fallback.
export async function fetchArenaCompanies(): Promise<Company[] | null> {
  if (!supabase) return null;

  let companyRows: CompanyRowWithRatings[];
  try {
    companyRows = await fetchArena();
  } catch (err) {
    console.error("Supabase arena load failed:", err);
    return null;
  }

  return companyRows.map((c) => {
    const ratings = {} as Record<QKey, Rating>;
    for (const r of c.ratings ?? []) {
      ratings[r.dimension] = {
        elo: r.elo,
        games: r.games,
        weekMovement: r.week_movement,
        seasonStart: r.season_start,
      };
    }
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

// Client-side arena load. Goes through the CACHED /api/arena route (revalidated
// every 60s) so a traffic spike hits Vercel's cache, not the database — every
// visitor pulling ~500 rows straight from PostgREST was the scaling cliff.
// Falls back to the in-memory seed (lib/seed.ts) when the route is unavailable
// (backend not configured, or any error), so local dev keeps working without a
// project wired up.
export async function loadCompanies(): Promise<Company[]> {
  try {
    const res = await fetch("/api/arena");
    if (res.ok) return (await res.json()) as Company[];
  } catch (err) {
    console.error("Arena route unavailable:", err);
  }
  return buildCompanies();
}
