import type { MetadataRoute } from "next";
import { companySlug, SITE_URL } from "@/lib/share";
import { loadAllCompanyRefs } from "@/lib/companyProfile";

// One sitemap for the whole surface: home, legal, and every live company's
// /c/[slug] profile (~4,500 URLs — well under the 50k single-sitemap limit).
// Regenerated at most daily.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await loadAllCompanyRefs();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/legal`, changeFrequency: "yearly", priority: 0.2 },
    ...companies.map((c) => ({
      url: `${SITE_URL}/c/${companySlug(c)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
