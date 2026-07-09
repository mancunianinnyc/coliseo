// Upgrades low-resolution self-hosted logos. The original fetch-logos.ts keeps
// the FIRST source that returns any image, which often lands on a tiny Google
// favicon (16–64px) that looks blurry in the UI. This pass instead, for every
// logo whose smaller side is under a quality threshold, tries several sources,
// decodes each candidate's real pixel size, and keeps the LARGEST — only
// overwriting the file on disk when the new image is meaningfully sharper.
//
//   npm run logos:upgrade            # upgrade logos under 128px
//   npm run logos:upgrade -- --all   # re-check every logo
//   npm run logos:upgrade -- --min=160
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { buildCompanies, logoSlug } from "../lib/seed";

const OUT_DIR = path.join(process.cwd(), "public", "logos");

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const MIN = Number((args.find((a) => a.startsWith("--min=")) ?? "--min=128").split("=")[1]);

// Read width/height from a PNG's IHDR chunk. Returns null if not a valid PNG.
function pngDims(buf: Buffer): { w: number; h: number } | null {
  const PNG_SIG = "89504e47";
  if (buf.length < 24 || buf.subarray(0, 4).toString("hex") !== PNG_SIG) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const minSide = (d: { w: number; h: number }) => Math.min(d.w, d.h);

// Candidate sources. PNG-only (the app serves .png); non-PNG responses are
// skipped rather than converted. Clearbit's logo API is retired (dead), so it's
// dropped; icon.horse and Google's sz=256 favicon reliably return the largest
// available apple-touch-icon (often 180–256px), so they lead.
function sources(domain: string): string[] {
  return [
    `https://icon.horse/icon/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    `https://${domain}/apple-touch-icon.png`,
    `https://unavatar.io/${domain}?fallback=false`,
  ];
}

async function fetchPng(url: string): Promise<{ buf: Buffer; dim: { w: number; h: number } } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const dim = pngDims(buf);
    if (!dim || buf.byteLength < 512) return null;
    return { buf, dim };
  } catch {
    return null;
  }
}

async function main() {
  const companies = buildCompanies();
  let upgraded = 0;
  let unchanged = 0;
  let stillLow = 0;
  const noPng: string[] = [];

  for (const c of companies) {
    const slug = logoSlug(c.website);
    const file = path.join(OUT_DIR, `${slug}.png`);
    const current = existsSync(file) ? pngDims(readFileSync(file)) : null;
    const curMin = current ? minSide(current) : 0;

    if (!ALL && curMin >= MIN) {
      unchanged++;
      continue;
    }

    // Try every source, keep the largest PNG.
    let best: { buf: Buffer; dim: { w: number; h: number } } | null = null;
    for (const url of sources(c.website)) {
      const got = await fetchPng(url);
      if (got && (!best || minSide(got.dim) > minSide(best.dim))) best = got;
      // 256px is plenty for a 34px tile @3x — stop early once we clear it.
      if (best && minSide(best.dim) >= 256) break;
    }

    if (best && minSide(best.dim) > curMin) {
      writeFileSync(file, best.buf);
      upgraded++;
      console.log(
        `↑ ${c.name.padEnd(18)} ${curMin || "—"}px → ${minSide(best.dim)}px  (${(best.buf.byteLength / 1024).toFixed(0)}kb)`,
      );
    } else {
      if (curMin < MIN) stillLow++;
      if (!best) noPng.push(`${c.name} (${c.website})`);
    }
  }

  console.log(`\nUpgraded ${upgraded} · unchanged ${unchanged} · still-low ${stillLow}`);
  if (noPng.length) console.log(`\nNo PNG source found for ${noPng.length}:\n  ${noPng.join("\n  ")}`);
}

main().catch((e) => {
  console.error("Logo upgrade failed:", e);
  process.exit(1);
});
