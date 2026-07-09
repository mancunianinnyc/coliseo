// Downloads each seed company's logo and self-hosts it under public/logos/,
// so the app never depends on a third-party logo host at runtime (Clearbit's
// free logo API is being retired). Tries a few sources in order and keeps the
// first that returns a real image.
//
//   npm run logos:fetch
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCompanies, logoSlug } from "../lib/seed";

const OUT_DIR = path.join(process.cwd(), "public", "logos");

// Candidate sources for a given domain, best-quality first.
function sources(domain: string): string[] {
  return [
    `https://logo.clearbit.com/${domain}?size=256`,
    `https://unavatar.io/${domain}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  ];
}

async function tryFetch(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Guard against 1x1 tracking pixels / empty responses.
    return buf.byteLength > 512 ? buf : null;
  } catch {
    return null;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const companies = buildCompanies();
  let ok = 0;
  const missing: string[] = [];

  for (const c of companies) {
    const slug = logoSlug(c.website);
    let saved = false;
    for (const url of sources(c.website)) {
      const buf = await tryFetch(url);
      if (buf) {
        writeFileSync(path.join(OUT_DIR, `${slug}.png`), buf);
        console.log(`✓ ${c.name.padEnd(12)} ${slug}.png  (${(buf.byteLength / 1024).toFixed(0)}kb)  ${new URL(url).host}`);
        ok++;
        saved = true;
        break;
      }
    }
    if (!saved) {
      console.log(`✗ ${c.name} — no logo found (will fall back to the coloured initial)`);
      missing.push(c.name);
    }
  }

  console.log(`\n${ok}/${companies.length} logos saved to public/logos/.`);
  if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error("Logo fetch failed:", err.message);
  process.exit(1);
});
