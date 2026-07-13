import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for OG/twitter image URLs (share cards resolve against this).
  metadataBase: new URL("https://convictionelo.vercel.app"),
  title: "Coliseo — Head-to-head startup ranking & discovery",
  description:
    "Head-to-head startup ranking & discovery. Vote on startup matchups across Conviction, Momentum & Talent — discover companies you didn't know, and see how the crowd really ranks them.",
  openGraph: {
    title: "Coliseo — Head-to-head startup ranking & discovery",
    description:
      "Vote on head-to-head startup matchups across Conviction, Momentum & Talent — discover new companies and see how the crowd ranks them.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let the layout own its own max-width; keep the phone from zooming out.
  maximumScale: 5,
  themeColor: "#f7f8fc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Privacy-friendly, cookieless pageviews + the custom funnel events
            in lib/track.ts. Requires Web Analytics enabled on the Vercel
            project; a silent no-op until then. */}
        <Analytics />
      </body>
    </html>
  );
}
