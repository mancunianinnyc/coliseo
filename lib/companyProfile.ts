import type { Company } from "./types";
import { supabase } from "./supabase";
import {
  COMPANY_COLUMNS,
  RATINGS_EMBED,
  mapCompanyRow,
  type CompanyRowWithRatings,
} from "./loadCompanies";

// Load ONE company (any of the ~4,500, not just the Arena500) for its public
// /c/[slug] profile page. Only status='live' rows are served — pending and
// rejected submissions must never get a public page. Returns null when not
// found / not live / Supabase unconfigured.
export async function loadCompanyProfile(id: number): Promise<Company | null> {
  if (!supabase || !Number.isFinite(id) || id <= 0) return null;
  const { data, error } = await supabase
    .from("companies")
    .select(`${COMPANY_COLUMNS}, ${RATINGS_EMBED}`)
    .eq("id", id)
    .eq("status", "live")
    .maybeSingle();
  if (error) {
    console.error("company profile load failed:", error.message);
    return null;
  }
  return data ? mapCompanyRow(data as unknown as CompanyRowWithRatings) : null;
}

// All live companies' (id, name) — the sitemap's source. Paginated past
// PostgREST's 1000-row cap. ~5 queries, regenerated once a day via ISR.
export async function loadAllCompanyRefs(): Promise<{ id: number; name: string }[]> {
  if (!supabase) return [];
  const out: { id: number; name: string }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("status", "live")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("company refs load failed:", error.message);
      break;
    }
    out.push(...((data ?? []) as { id: number; name: string }[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}
