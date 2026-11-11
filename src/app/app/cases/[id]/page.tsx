import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CaseActions from "@/components/case-actions";
import { requirePageSession } from "@/lib/auth";
import { SCENARIO_LABELS } from "@/lib/domain";
import { getCaseRecord } from "@/lib/store";

export const metadata: Metadata = { title: "Case details" };
export const dynamic = "force-dynamic";

function statusLabel(state: string) {
  if (state === "needs_review") return "Review required";
  if (state === "insufficient_evidence") return "Insufficient evidence";
  if (state === "planned") return "Plan ready";
  return "Draft";
}

function dateLabel(value: string | null) {
  if (!value) return "Not confirmed";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value));
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  if (!session) return null;
  const { id } = await params;
  const record = getCaseRecord(id, session.orgId);
  if (!record) notFound();
  const evidence = record.evidence;
  const outcome = record.state === "needs_review" ? "Review required" :
    record.state === "insufficient_evidence" ? "Insufficient evidence" :
      record.state === "blocked" ? "Blocked" : "Decision pending";

  return (
    <>
      <header className="page-heading case-detail-heading">
        <div>
          <p className="eyebrow">Cases / {SCENARIO_LABELS[record.scenario]}</p>
          <h1>Case details</h1>
          <p className="case-id">{record.id}</p>
        </div>
        <div className="detail-heading-badges">
          <span className="mode-label">Simulated</span>
          <span className="status-pill"><span className="status-dot" />{statusLabel(record.state)}</span>
        </div>
      </header>

      <div className="page-grid">
        <div className="case-primary">
          <section className="panel case-section" aria-labelledby="question-title">
            <h2 id="question-title">Question</h2>
            <dl className="detail-rows">
              <div><dt>Scenario</dt><dd>{SCENARIO_LABELS[record.scenario]}</dd></div>
              <div><dt>Decision question</dt><dd>{record.question}</dd></div>
              <div><dt>Environment</dt><dd>Simulated fixture</dd></div>
              <div><dt>Created</dt><dd><time dateTime={record.createdAt}>{dateLabel(record.createdAt)}</time></dd></div>
            </dl>
          </section>

          <section className="panel case-section" aria-labelledby="plan-title">
            <h2 id="plan-title">Evidence plan</h2>
            {record.plan ? (
              <>
                <dl className="detail-rows">
                  <div><dt>Missing question</dt><dd>{record.plan.missingQuestion}</dd></div>
                  <div><dt>Proposed capability</dt><dd>{record.plan.capability}</dd></div>
                  <div><dt>Why this source</dt><dd>{record.plan.rationale}</dd></div>
                  <div><dt>Expected cost</dt><dd>{record.plan.expectedCost}</dd></div>
                  <div><dt>Provider</dt><dd>{record.plan.providerStatus}</dd></div>
                </dl>
                <p className="plan-status">Plan mode: {record.planMode === "serv" ? "SERV" : "Simulated"}{record.model ? " · Model: " + record.model : ""}</p>
                {record.planMode === "serv" && (
                  <p className="field-help">SERV request ID: {record.servRequestId || "Not returned"}</p>
                )}
                <ul className="limitations">{record.plan.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            ) : (
              <p className="empty-inline">No validated plan exists for this case yet.</p>
            )}
            <CaseActions caseId={record.id} hasPlan={Boolean(record.plan)} hasEvidence={Boolean(evidence)} hasReview={Boolean(record.reviewedAt)} />
          </section>

          <section className="panel case-section" aria-labelledby="evidence-title">
            <h2 id="evidence-title">Evidence</h2>
            {!evidence ? (
              <p className="empty-inline">No evidence has been retrieved for this case.</p>
            ) : (
              <>
                <div className="receipt-card-app">
                  <p className="eyebrow">Evidence receipt · Simulated</p>
                  <dl className="detail-rows">
                    <div><dt>Source operator</dt><dd>{evidence.operatorName}</dd></div>
                    <div><dt>Upstream source</dt><dd>{evidence.upstreamName}</dd></div>
                    <div><dt>Evidence source</dt><dd>{evidence.sourceName}</dd></div>
                    <div><dt>Matched subject</dt><dd>{evidence.matchedSubject}</dd></div>
                    <div><dt>Retrieved</dt><dd><time dateTime={evidence.retrievedAt}>{dateLabel(evidence.retrievedAt)}</time></dd></div>
                    <div><dt>Source time</dt><dd>{dateLabel(evidence.sourceTimestamp)}</dd></div>
                    <div><dt>Payment state</dt><dd>Simulated. No payment was made.</dd></div>
                    <div><dt>Amount, asset, network</dt><dd>Not applicable to fixture mode.</dd></div>
                    <div><dt>Transaction reference</dt><dd>None. No real transaction exists.</dd></div>
                    <div><dt>Stored content digest</dt><dd className="mono">{evidence.digestSha256}</dd></div>
                  </dl>
                  <ul className="limitations">{evidence.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                  <p className="caption">The digest shows the retained fixture bytes have not changed. It does not verify a source or its accuracy.</p>
                </div>
                <div className="decision-banner">
                  <h3>{outcome}</h3>
                  <p>{record.decisionReason}</p>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="case-secondary">
          <section className="panel side-section" aria-labelledby="session-title">
            <h2 id="session-title">Spending session</h2>
            <dl className="detail-rows">
              <div><dt>Status</dt><dd>Unavailable</dd></div>
              <div><dt>Provider</dt><dd>Not confirmed</dd></div>
              <div><dt>Maximum per payment</dt><dd>Not set</dd></div>
              <div><dt>Total limit</dt><dd>Not set</dd></div>
              <div><dt>Asset and network</dt><dd>Not confirmed</dd></div>
              <div><dt>Expires</dt><dd>Not set</dd></div>
            </dl>
            <div className="error-banner">Live payments are unavailable until provider eligibility, session binding, no allowance fallback and quote integrity are verified.</div>
            <Link className="text-link" href="/app/sessions/unavailable">Session controls</Link>
          </section>

          {record.reviewedAt && (
            <section className="panel side-section" aria-labelledby="review-title">
              <h2 id="review-title">Recorded review</h2>
              <dl className="detail-rows">
                <div><dt>Action</dt><dd>{record.reviewAction?.replaceAll("_", " ")}</dd></div>
                <div><dt>Recorded</dt><dd><time dateTime={record.reviewedAt}>{dateLabel(record.reviewedAt)}</time></dd></div>
                {record.reviewNote && <div><dt>Note</dt><dd>{record.reviewNote}</dd></div>}
              </dl>
              <p className="caption">Recording a review does not approve an invoice or transfer funds.</p>
            </section>
          )}
        </aside>
      </div>
      <p className="back-link"><Link className="text-link" href="/app/cases">Back to cases</Link></p>
    </>
  );
}