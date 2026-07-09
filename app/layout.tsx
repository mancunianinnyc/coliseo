import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConvictionELO — Crowd-ranked startup leaderboard & discovery",
  description:
    "Startup discovery, ranked by conviction. Vote on head-to-head startup matchups across Value, Growth & Workplace — discover companies you didn't know, and see how the crowd really ranks them.",
  openGraph: {
    title: "ConvictionELO — Startup discovery, ranked by conviction",
    description:
      "Vote on head-to-head startup matchups across Value, Growth & Workplace — discover new companies and see how the crowd ranks them.",
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
      <body>{children}</body>
    </html>
  );
}
