"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="login-page">
      <section className="login-card" role="alert">
        <p className="eyebrow">Veyra</p>
        <h1>This page could not load</h1>
        <p className="body-copy">Try again. If the problem continues, return to the public demo.</p>
        <div className="demo-actions">
          <button className="button button-primary" type="button" onClick={() => reset()}>Try again</button>
          <a className="button button-secondary" href="/demo">Return to demo</a>
        </div>
      </section>
    </main>
  );
}