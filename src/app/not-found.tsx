import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">Veyra</p>
        <h1>Page not found</h1>
        <p className="body-copy">The page or case could not be found in this workspace.</p>
        <p><Link className="text-link" href="/app/cases">Return to cases</Link></p>
        <p><Link className="text-link" href="/demo">View the public demo</Link></p>
      </section>
    </main>
  );
}
