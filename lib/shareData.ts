import { supabase } from "./supabase";
import { SITE_URL } from "./share";

// The slice of a company a share surface needs (landing page + OG image).
export interface ShareCompany {
  id: number;
  name: string;
  logoUrl: string | null; // absolute URL, ready for <img src>
  gradient: string; // fallback tile when there's no logo
  blurb: string | null; // one-liner (used by the t=c profile card)
  category: string;
  region: string;
}

const FALLBACK_GRADIENT = "linear-gradient(135deg,#0eb6a6,#37b6ff)";

// Logos are stored either as site-relative paths ("/logos/x.png") or absolute
// https URLs (YC CDN). OG rendering happens off-site (satori fetches the
// image), so relative paths must become absolute.
const absoluteLogo = (logo: string | null): string | null =>
  !logo ? null : logo.startsWith("http") ? logo : `${SITE_URL}${logo.startsWith("/") ? "" : "/"}${logo}`;

// Look up the handful of companies a share card mentions. Returns a map by id;
// missing ids (bad param, deleted company) are simply absent — callers degrade
// to a generic card.
export async function loadShareCompanies(ids: number[]): Promise<Map<number, ShareCompany>> {
  const map = new Map<number, ShareCompany>();
  const unique = [...new Set(ids)].filter((x) => Number.isFinite(x) && x > 0).slice(0, 12);
  if (!supabase || unique.length === 0) return map;
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, logo_url, gradient, blurb, category, region")
    .eq("status", "live")
    .in("id", unique);
  if (error) {
    console.error("share company lookup failed:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      logoUrl: absoluteLogo(row.logo_url),
      gradient: row.gradient ?? FALLBACK_GRADIENT,
      blurb: row.blurb ?? null,
      category: row.category,
      region: row.region,
    });
  }
  return map;
}
