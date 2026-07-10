import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Terms — Coliseo",
  description: "How Coliseo handles your data, and the terms of using it.",
};

// Plain-language privacy notice + terms. Deliberately short and honest for a
// small, anonymous, open-source project — not a substitute for legal review
// before a large-scale launch.
export default function LegalPage() {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        ← Back to Coliseo
      </Link>

      <h1 className="legal-title">Privacy &amp; Terms</h1>
      <p className="legal-meta">Last updated: July 2026</p>

      <p className="legal-lead">
        Coliseo is a crowd-ranked startup discovery game. It&apos;s free, open source, and
        deliberately light on data collection. Here&apos;s exactly how it works and what we do with
        the little data it keeps.
      </p>

      <h2 className="legal-h2">Privacy</h2>

      <h3 className="legal-h3">No account, no personal details</h3>
      <p>
        You don&apos;t sign up, and we never ask for your name, email, or password. When you first
        visit, the app creates an <strong>anonymous, pseudonymous identity</strong> (a random ID) and
        stores it in your browser so a returning visit keeps your streak. That ID isn&apos;t linked to
        you as a person.
      </p>

      <h3 className="legal-h3">What we store</h3>
      <ul className="legal-list">
        <li>
          <strong>Your votes</strong> — which company you picked in each head-to-head, the dimension
          (Value / Growth / Workplace), and when.
        </li>
        <li>
          <strong>Your progress</strong> — your daily streak and credibility tier.
        </li>
        <li>
          <strong>&ldquo;I don&apos;t know this company&rdquo; signals</strong> — used only to
          understand which companies are obscure.
        </li>
        <li>
          If you <strong>submit a company</strong>, the details you enter (name, website, category,
          and so on) plus your pseudonymous ID, so we can moderate submissions.
        </li>
      </ul>
      <p>
        All of it is tied to the anonymous ID, not to your identity. Data is stored with{" "}
        <a href="https://supabase.com" target="_blank" rel="noreferrer">
          Supabase
        </a>{" "}
        (a hosted Postgres database).
      </p>

      <h3 className="legal-h3">What we don&apos;t do</h3>
      <ul className="legal-list">
        <li>No advertising, no ad networks, no third-party trackers.</li>
        <li>We don&apos;t sell or share your data.</li>
        <li>No analytics cookies beyond what&apos;s needed to keep you signed in on this device.</li>
      </ul>

      <h3 className="legal-h3">Your control</h3>
      <p>
        You can wipe your local identity any time by clearing this site&apos;s browser storage —
        you&apos;ll start fresh as a new anonymous visitor. To have submitted content removed, contact
        us below.
      </p>

      <h2 className="legal-h2">Terms of use</h2>

      <h3 className="legal-h3">What Coliseo is (and isn&apos;t)</h3>
      <p>
        The service is provided <strong>&ldquo;as is,&rdquo; for entertainment and informational
        purposes</strong>. Company details are compiled from public sources and may be incomplete,
        inaccurate, or out of date. Ratings reflect the <strong>crowd&apos;s opinion</strong> — they
        are not fact, financial advice, or an endorsement of any company. Don&apos;t make investment or
        career decisions based on them.
      </p>

      <h3 className="legal-h3">Fair use</h3>
      <ul className="legal-list">
        <li>Don&apos;t use bots, scripts, or multiple identities to manipulate rankings.</li>
        <li>Don&apos;t scrape, overload, or attempt to break the service.</li>
        <li>
          When you submit a company, you confirm the information comes from public sources.
          Submissions are moderated and may be edited or declined.
        </li>
      </ul>

      <h3 className="legal-h3">Open source</h3>
      <p>
        Coliseo is released under the{" "}
        <a href="https://github.com/mancunianinnyc/coliseo/blob/main/LICENSE" target="_blank" rel="noreferrer">
          AGPL-3.0 license
        </a>
        . The code — including the rating math — is fully auditable on{" "}
        <a href="https://github.com/mancunianinnyc/coliseo" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>

      <h3 className="legal-h3">Changes</h3>
      <p>
        This is an evolving project. We may change, pause, or discontinue features at any time, and
        we may update this page — the &ldquo;last updated&rdquo; date above will change when we do.
      </p>

      <h3 className="legal-h3">Contact</h3>
      <p>
        Questions, corrections, or removal requests? Reach{" "}
        <a href="https://www.rossgarlick.com" target="_blank" rel="noreferrer">
          Ross Garlick
        </a>{" "}
        or open an issue on{" "}
        <a href="https://github.com/mancunianinnyc/coliseo/issues" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>

      <p className="legal-fine">
        This is a plain-language summary for a small project, not formal legal advice.
      </p>

      <Link href="/" className="legal-back legal-back-bottom">
        ← Back to Coliseo
      </Link>
    </main>
  );
}
