"use client";

import Link from "next/link";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="empty-state" role="alert">
      <h1>This page could not load</h1>
      <p>Check your connection and try again. No application details are shown here.</p>
      <div className="demo-actions">
        <button className="button button-primary" type="button" onClick={() => reset()}>Try again</button>
        <Link className="button button-secondary" href="/app/cases">Return to cases</Link>
      </div>
    </section>
  );
}