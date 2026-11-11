import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Spending session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <header className="page-heading">
        <div><p className="eyebrow">Spending session</p><h1>Session controls</h1><p className="case-id">{id}</p></div>
        <span className="mode-label">Unavailable</span>
      </header>
      <section className="panel settings-stack">
        <h2>Live payments are disabled</h2>
        <p className="body-copy">No Passport session was requested. The live integration stays gated until the separate-session and explicit-session-ID flow has been verified against your Passport account.</p>
        <p className="error-banner">No funds were spent. Do not treat this page as a Passport approval flow.</p>
        <Link className="text-link" href="/app/cases">Return to cases</Link>
      </section>
    </>
  );
}
