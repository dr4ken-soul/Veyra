"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CaseActions({
  caseId,
  hasPlan,
  hasEvidence,
  hasReview
}: {
  caseId: string;
  hasPlan: boolean;
  hasEvidence: boolean;
  hasReview: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [action, setAction] = useState("keep_on_hold");
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (reviewOpen && !dialog.open) dialog.showModal();
    if (!reviewOpen && dialog.open) dialog.close();
  }, [reviewOpen]);

  async function send(path: string, key: string, body?: Record<string, unknown>) {
    setPending(key);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "The action could not be completed. Try again.");
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be completed. Try again.");
      return false;
    } finally {
      setPending("");
    }
  }

  async function recordReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await send("/api/v1/cases/" + caseId + "/review", "review", { action, note });
    if (saved) {
      setReviewOpen(false);
      setNote("");
    }
  }

  return (
    <div className="case-actions">
      {!hasPlan && (
        <div>
          <p className="field-help">If SERV is configured, these case fields will be sent to SERV for planning. Otherwise Veyra creates a simulated plan.</p>
          <button
            className="button button-primary"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => send("/api/v1/cases/" + caseId + "/plan", "plan")}
          >{pending === "plan" ? "Preparing the evidence plan" : "Create evidence plan"}</button>
        </div>
      )}
      {hasPlan && !hasEvidence && (
        <div>
          <p className="field-help">This action reads local synthetic data only. It does not call a provider or make a payment.</p>
          <button
            className="button button-primary"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => send("/api/v1/cases/" + caseId + "/execute", "evidence")}
          >{pending === "evidence" ? "Preparing simulated evidence" : "Run simulated evidence check"}</button>
        </div>
      )}
      {hasEvidence && (
        <div className="review-action-row">
          <div>
            <p className="field-help">{hasReview ? "A review action has been recorded." : "Record a human review. This does not approve or pay an invoice."}</p>
            <button className="button button-secondary" type="button" onClick={() => setReviewOpen(true)}>Record review</button>
          </div>
          <a className="text-link" href={"/api/v1/cases/" + caseId + "/receipt"} target="_blank" rel="noreferrer">Export case receipt as JSON</a>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}

      <dialog className="review-dialog" ref={dialogRef} aria-labelledby="review-dialog-title" onClose={() => setReviewOpen(false)}>
        <form onSubmit={recordReview}>
          <div className="dialog-head">
            <div>
              <p className="eyebrow">Human review</p>
              <h2 id="review-dialog-title">Record review</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Close review dialog" onClick={() => setReviewOpen(false)}>Close</button>
          </div>
          <label className="field-label" htmlFor="review-action">Action</label>
          <select className="text-input" id="review-action" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="keep_on_hold">Keep on hold</option>
            <option value="request_more_evidence">Request more evidence</option>
            <option value="close_review">Close review record</option>
          </select>
          <label className="field-label note-label" htmlFor="review-note">Optional note</label>
          <textarea className="text-input textarea" id="review-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          <p className="field-help">Do not enter account numbers or passkeys. Veyra will redact long digit strings in this note.</p>
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setReviewOpen(false)}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={Boolean(pending)}>{pending === "review" ? "Recording review" : "Save review"}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}