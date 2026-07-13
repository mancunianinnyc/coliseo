import { NextResponse } from "next/server";

// URL-first Submit auto-fill. The browser can't fetch another site (CORS), so
// this server route fetches the company's homepage and reads the metadata the
// site publishes about itself (OpenGraph / meta / <title> / icons). It returns
// name + description + logo as *suggestions* — the user edits before submitting.
//
// This is the free, no-API-key version. Founders/funding/category aren't in a
// site's tags; richer AI enrichment is a planned follow-up.

export const runtime = "nodejs";

// Parse every <meta> tag into a { key -> content } map, tolerating attributes
// in any order (some sites write content="…" before property="…").
function parseMetas(html: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content != null && !(key in map)) map[key] = decode(content);
  }
  return map;
}

// Best icon <link> (apple-touch-icon preferred; it's usually a square logo).
function parseIcon(html: string): string | undefined {
  let apple: string | undefined;
  let icon: string | undefined;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) apple ??= href;
    else if (rel.includes("icon")) icon ??= href;
  }
  return apple ?? icon;
}

function title(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decode(m[1].trim()) : undefined;
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function codePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

// A title is often "Brand | tagline" (brand first) but sometimes "Home \ Brand"
// (brand last). Take the first segment, unless it's a generic word.
function brandFromTitle(rawTitle: string): string {
  const parts = rawTitle.split(/\s+[|•·–—:\\/]\s+/).map((p) => p.trim()).filter(Boolean);
  let name = parts[0] ?? rawTitle.trim();
  if (parts.length > 1 && /^(home|homepage|home page|welcome)$/i.test(name)) {
    name = parts[parts.length - 1];
  }
  return name.slice(0, 60);
}

function absolutize(src: string, base: URL): string | undefined {
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  // Normalise to an absolute https URL.
  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  let html = "";
  let finalUrl = target;
  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites serve minimal/blocked responses to non-browser agents.
        "User-Agent":
          "Mozilla/5.0 (compatible; Coliseo/1.0; +https://coliseoelo.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    finalUrl = new URL(res.url || target.toString());
    html = (await res.text()).slice(0, 500_000); // cap: we only need the <head>
  } catch {
    return NextResponse.json(
      { error: "could not reach the site", website: target.host.replace(/^www\./, "") },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const metas = parseMetas(html);

  const rawTitle = metas["og:site_name"] ?? metas["og:title"] ?? title(html);
  const name = rawTitle ? brandFromTitle(rawTitle) : undefined;

  const description = (
    metas["og:description"] ??
    metas["description"] ??
    metas["twitter:description"]
  )?.slice(0, 280);

  // Prefer a square brand icon (apple-touch-icon) for the logo tile, then
  // og:image, then any icon, then the default favicon. Icon hrefs come straight
  // from the tag, so decode entities (e.g. &amp;) before using them as a URL.
  const iconSrc = parseIcon(html) ?? metas["og:image"];
  const logo = iconSrc ? absolutize(decode(iconSrc), finalUrl) : `${finalUrl.origin}/favicon.ico`;

  return NextResponse.json({
    website: finalUrl.host.replace(/^www\./, ""),
    name,
    description,
    logo,
  });
}
