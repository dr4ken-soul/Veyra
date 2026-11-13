"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_SCENARIOS } from "@/lib/demo-data";
import { SCENARIOS, SCENARIO_LABELS, type Scenario } from "@/lib/domain";
import LiveCompanyLookup from "@/components/live-company-lookup";

export default function DemoPlayground({ liveWalletPaymentsEnabled }: { liveWalletPaymentsEnabled: boolean }) {
  const [scenario, setScenario] = useState<Scenario>("supplier");
  const [stage, setStage] = useState(0);
  const sample = DEMO_SCENARIOS[scenario];

  function select(value: Scenario) {
    setScenario(value);
    setStage(0);
  }

  return (
    <main className="demo-page">
      <div className="demo-topbar">
        <Link className="brand-word" href="/">Veyra</Link>
        <span className="mode-label">Live lookup + examples</span>
      </div>
      <section className="demo-heading">
        <p className="eyebrow">Veyra public demo</p>
        <h1 className="section-title">Check a company against the live registry</h1>
        <p className="body-copy">Run a real French company profile lookup through Sirenic. You review the quote and approve a one-time payment from your own wallet. Veyra does not use or charge the operator’s Passport wallet for this public flow.</p>
      </section>

      <LiveCompanyLookup enabled={liveWalletPaymentsEnabled} />

      <section className="illustrative-section" aria-labelledby="illustrative-title">
        <p className="eyebrow">Synthetic examples · no provider calls or payments</p>
        <h2 id="illustrative-title">Explore other evidence scenarios</h2>
        <p>These fixtures show how Veyra frames a question and its evidence limits. They are examples only; the live visitor-paid integration above currently covers French company registry profiles.</p>
      </section>

      <div className="scenario-picker" role="group" aria-label="Choose a scenario">
        {SCENARIOS.map((item) => (
          <button
            className={"scenario-choice " + (item === scenario ? "is-selected" : "")}
            key={item}
            type="button"
            aria-pressed={item === scenario}
            onClick={() => select(item)}
          >{SCENARIO_LABELS[item]}</button>
        ))}
      </div>

      <div className="demo-workflow">
        <section className="panel demo-case-panel" aria-labelledby="demo-case-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Question</p>
              <h2 id="demo-case-title">{SCENARIO_LABELS[scenario]}</h2>
            </div>
            <span className="status-pill"><span className="status-dot" />Simulated</span>
          </div>
          <p className="demo-question">
            {scenario === "supplier" && "A supplier requests changed payment details. What can be established before an invoice is considered?"}
            {scenario === "shipment" && "Does a carrier record support the claimed delivery status?"}
            {scenario === "registration" && "Is the counterparty currently recorded as active in a specified registry?"}
          </p>
          <dl className="receipt-rows demo-facts">
            <div><dt>Subject</dt><dd>{sample.subject}</dd></div>
            <div><dt>Proposed evidence</dt><dd>{sample.evidence}</dd></div>
            {stage >= 1 && <div><dt>Plan</dt><dd>Example planning step. This fixture does not call a provider.</dd></div>}
            {stage >= 2 && <div><dt>Payment state</dt><dd>Simulated. No transaction or payment receipt exists.</dd></div>}
          </dl>
          <div className="demo-actions">
            {stage === 0 && <button className="button button-primary" type="button" onClick={() => setStage(1)}>Show evidence plan</button>}
            {stage === 1 && <button className="button button-primary" type="button" onClick={() => setStage(2)}>Show simulated evidence</button>}
            {stage === 2 && <button className="button button-secondary" type="button" onClick={() => setStage(0)}>Reset example</button>}
            <Link className="text-link" href="/login?next=%2Fapp%2Fcases%2Fnew">Open the operator workspace</Link>
          </div>
        </section>

        <aside className="panel demo-result-panel" aria-live="polite">
          <p className="eyebrow">Review boundary</p>
          <h2>{stage < 2 ? "The decision stays open" : sample.verdict}</h2>
          <p>{stage < 2 ? "Veyra shows the planned evidence and limitations before a user decides what to do next." : sample.limitation}</p>
          {stage >= 2 && (
            <div className="receipt-mini">
              <div><span>Source operator</span><strong>Veyra fixture adapter</strong></div>
              <div><span>Upstream source</span><strong>Synthetic demonstration data</strong></div>
              <div><span>Payment</span><strong>Simulated, no transaction</strong></div>
              <div><span>Environment</span><strong>Fixture</strong></div>
            </div>
          )}
          <p className="caption">No real company, carrier, transaction, provider response or SERV request is shown.</p>
        </aside>
      </div>

      <div className="demo-disclaimer">
        <strong>Illustrative limits.</strong> {sample.limitation} A person retains the business decision. Veyra never releases an invoice.
      </div>
    </main>
  );
}
