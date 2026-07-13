"use client";

import { track as vercelTrack } from "@vercel/analytics";

// Thin wrapper over Vercel Analytics custom events, so instrumentation can't
// ever break the app (analytics blocked, not yet enabled on the project, ad
// blockers). Events show up in the Vercel dashboard next to pageviews — the
// launch funnel (onboard → vote → day_done → exhibition → share) with zero
// extra backend load.
//
// Keep names/props LOW-CARDINALITY (they're aggregated, not a log): no ids,
// no free text beyond the truncated error message.
export function track(
  name: string,
  props?: Record<string, string | number | boolean | null>,
): void {
  try {
    vercelTrack(name, props);
  } catch {
    /* analytics must never take the app down */
  }
}

// Minimal client-side error reporting until a real Sentry is wired up:
// uncaught errors and unhandled rejections become client_error events, so
// prod breakage is at least *visible* in the dashboard.
let installed = false;
export function installErrorTracking(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    track("client_error", { msg: String(e.message ?? "unknown").slice(0, 180) });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as { message?: string } | string | undefined;
    const msg = typeof reason === "string" ? reason : (reason?.message ?? "unhandled rejection");
    track("client_error", { msg: String(msg).slice(0, 180) });
  });
}
