import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { Company, QKey } from "@/lib/types";
import { QUESTIONS } from "@/lib/questions";
import { composite, confidence } from "@/lib/elo";
import { companySlug, slugId, SITE_URL } from "@/lib/share";
import { loadCompanyProfile } from "@/lib/companyProfile";

// Public, crawlable company profile — one page per company across the WHOLE
// database (~4,500), not just the Arena500. This is the SEO surface: every
// "<startup name> rating" search, share card, and future badge points here.
// ISR keeps it cheap: each profile regenerates at most every 5 minutes.

export const revalidate = 300;

type Params = { params: { slug: string } };

const isActive = (c: Company) => (c.lifecycle ?? "active") === "active";
const webDomain = (w: string) => (w ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

async function loadFromSlug(slug: string): Promise<Company | null> {
  const id = slugId(slug);
  if (!id) return null;
  return loadCompanyProfile(id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await loadFromSlug(params.slug);
  if (!c) return { title: "Company not found — Coliseo" };
  const title = `${c.name} — Coliseo rating & startup profile`;
  const description = `${c.blurb || c.description || `${c.category} startup`} · Crowd-ranked on Conviction, Momentum & Talent. See ${c.name}'s live Elo rating on Coliseo.`.slice(0, 300);
  const img = `${SITE_URL}/api/og?t=c&c=${c.id}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/c/${companySlug(c)}` },
    openGraph: { title, description, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function CompanyProfile({ params }: Params) {
  const c = await loadFromSlug(params.slug);
  if (!c) notFound();
  // A stale/wrong name part 301s to the canonical slug (rename-proof URLs).
  const canonical = companySlug(c);
  if (params.slug !== canonical) permanentRedirect(`/c/${canonical}`);

  const games = c.ratings.V.games + c.ratings.G.games + c.ratings.D.games;
  const facts: [string, string | undefined][] = [
    ["Founded", c.foundedYear ? String(c.foundedYear) : undefined],
    ["Headquarters", c.headquarters],
    ["Team size", c.employees],
    ["Total funding", c.totalFunding],
    ["Valuation", c.valuation],
    ["Stage", `${c.stage}-stage`],
  ];
  const shownFacts = facts.filter(([, v]) => v);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    url: `https://${webDomain(c.website)}`,
    description: c.description || c.blurb || undefined,
    foundingDate: c.foundedYear ? String(c.foundedYear) : undefined,
    logo: c.logoUrl
      ? c.logoUrl.startsWith("http")
        ? c.logoUrl
        : `${SITE_URL}${c.logoUrl}`
      : undefined,
  };

  return (
    <div className="wrap profile-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="top">
        <a className="brand profile-brand" href="/">
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-mark" src="/coliseo-mark.svg" alt="" /> Coliseo
          </div>
          <div className="tagline">Head-to-Head Startup Ranking &amp; Discovery</div>
        </a>
      </header>

      <div className="profile-head">
        <div className="em-lg" style={{ background: c.gradient }}>
          {c.name[0]}
          {c.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt={`${c.name} logo`} />
          )}
        </div>
        <div className="profile-id">
          <h1 className="sec" style={{ margin: 0 }}>
            {c.name}
          </h1>
          <div className="cat">
            {c.category} · {c.region} · {c.stage}-stage
          </div>
          <a className="weblink" href={`https://${webDomain(c.website)}`} target="_blank" rel="noreferrer">
            {webDomain(c.website)} ↗
          </a>
        </div>
      </div>

      {!isActive(c) && (
        <div className="grad-banner">
          🎓 Graduated{c.exitNote ? ` — ${c.exitNote}` : ""}. No longer in the arena; final rating
          shown below.
        </div>
      )}

      {c.tags && c.tags.length > 0 && (
        <div className="profile-tags">
          {c.tags.map((t) => (
            <span key={t} className="ptag">
              {t}
            </span>
          ))}
        </div>
      )}

      {(c.description || c.blurb) && <p className="profile-desc">{c.description || c.blurb}</p>}

      {shownFacts.length > 0 && (
        <div className="facts">
          {shownFacts.map(([label, val]) => (
            <div className="fact" key={label}>
              <div className="fact-l">{label}</div>
              <div className="fact-v">{val}</div>
            </div>
          ))}
        </div>
      )}

      {c.founders && c.founders.length > 0 && (
        <div className="fact founders">
          <div className="fact-l">Founder{c.founders.length > 1 ? "s" : ""}</div>
          <div className="fact-v">{c.founders.join(" · ")}</div>
        </div>
      )}

      <div className="dossier-sub">📊 Coliseo ratings</div>
      <div className="vr">
        <span className="q">🏆 Overall {isActive(c) ? "" : "(final)"}</span>
        <span className="p">{composite(c)} Elo</span>
      </div>
      <div className="rating-cards">
        {(["V", "G", "D"] as QKey[]).map((q) => (
          <div className="rcard" key={q}>
            <div className="rc-elo">{c.ratings[q].elo}</div>
            <div className="cat">
              {QUESTIONS[q].emoji} {QUESTIONS[q].label}
            </div>
            <div className={`rc-conf ${confidence(c, q) === "Established" ? "est" : "prov"}`}>
              {confidence(c, q)}
            </div>
          </div>
        ))}
      </div>
      <div className="vr">
        <span className="q">Total matchups</span>
        <span className="p">{games}</span>
      </div>

      {c.links && (c.links.x || c.links.linkedin || c.links.crunchbase) && (
        <div className="links-row">
          {c.links.x && (
            <a href={c.links.x} target="_blank" rel="noreferrer" className="linkbtn">
              𝕏 X
            </a>
          )}
          {c.links.linkedin && (
            <a href={c.links.linkedin} target="_blank" rel="noreferrer" className="linkbtn">
              in LinkedIn
            </a>
          )}
          {c.links.crunchbase && (
            <a href={c.links.crunchbase} target="_blank" rel="noreferrer" className="linkbtn">
              ◆ Crunchbase
            </a>
          )}
        </div>
      )}

      <a className="nextbtn share-cta" href="/">
        ⚔️ Vote on today&apos;s matchups →
      </a>
      <p className="done-note">
        Ratings are live Elo scores from head-to-head crowd votes — opinion, not fact or financial
        advice. <a href="/legal">How it works →</a>
      </p>
    </div>
  );
}
