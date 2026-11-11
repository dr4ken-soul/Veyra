import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const servConfigured = Boolean((process.env.SERV_REASONING_API_KEY || process.env.SERV_API_KEY) && process.env.SERV_MODEL);
  const key = process.env.VYERA_API_KEY || "";
  const prefix = key ? key.slice(0, 10) + "…" : "Not configured";

  return (
    <>
      <header className="page-heading">
        <div><h1>Settings</h1><p>Provider status and configuration for this local workspace.</p></div>
      </header>
      <div className="settings-stack">
        <section className="panel side-section">
          <h2>Evidence providers</h2>
          <dl className="detail-rows">
            <div><dt>Simulated scenario fixture</dt><dd>Veyra fixture adapter · synthetic data · Fixture mode</dd></div>
            <div><dt>Registry provider</dt><dd>No live endpoint verified</dd></div>
            <div><dt>Shipment provider</dt><dd>No live endpoint verified</dd></div>
            <div><dt>Bank ownership provider</dt><dd>No provider configured</dd></div>
          </dl>
        </section>

        <section className="panel side-section">
          <h2>Reasoning</h2>
          <dl className="detail-rows">
            <div><dt>SERV</dt><dd>{servConfigured ? "Configured. A live request is made only when a user asks to create a plan." : "Not configured. Plans use the local simulated planner."}</dd></div>
            <div><dt>Configured model</dt><dd>{process.env.SERV_MODEL || "Not confirmed"}</dd></div>
            <div><dt>Request identifier</dt><dd>Shown only when returned by SERV</dd></div>
          </dl>
        </section>

        <section className="panel side-section">
          <h2>Integration</h2>
          <dl className="detail-rows">
            <div><dt>API credential prefix</dt><dd className="mono">{prefix}</dd></div>
            <div><dt>Credential scopes</dt><dd>Single local workspace owner</dd></div>
            <div><dt>Passport</dt><dd>Unavailable. No session or payment capability is enabled.</dd></div>
          </dl>
          <p className="caption">The API secret is read from the private .env file. It is never returned to the browser or stored in the database.</p>
        </section>

        <section className="panel side-section">
          <h2>Data handling</h2>
          <dl className="detail-rows">
            <div><dt>Storage</dt><dd>Local SQLite file under this project folder</dd></div>
            <div><dt>Retention</dt><dd>Data retention policy not configured</dd></div>
            <div><dt>Deletion controls</dt><dd>Not implemented</dd></div>
          </dl>
          <p className="caption">Use synthetic data in this hackathon build. Do not enter bank account numbers or confidential customer information.</p>
        </section>
      </div>
    </>
  );
}