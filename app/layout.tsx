import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConvictionELO",
  description:
    "A daily game where people vote on head-to-head startup matchups. Build your conviction.",
  openGraph: {
    title: "ConvictionELO",
    description: "Vote on which startup wins on Value, Growth, or Workplace.",
  },
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
