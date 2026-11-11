"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SCENARIOS, SCENARIO_LABELS, type Scenario } from "@/lib/domain";

const fields: Record<Scenario, { key: string; label: string; help?: string }[]> = {
  supplier: [
    { key: "supplierName", label: "Supplier name" },
    { key: "registrationNumber", label: "Company registration number" },
    { key: "jurisdiction", label: "Jurisdiction" },
    { key: "changeDescription", label: "What changed?", help: "Summarise the request only. Do not enter bank account details." }
  ],
  shipment: [
    { key: "carrier", label: "Carrier" },
    { key: "trackingReference", label: "Tracking reference" },
    { key: "claimedStatus", label: "Claimed status" }
  ],
  registration: [
    { key: "registrationNumber", label: "Company registration number" },
    { key: "jurisdiction", label: "Jurisdiction" }
  ]
};

export default function CaseForm({ liveScenarios, testShipmentEnabled }: { liveScenarios: Scenario[]; testShipmentEnabled: boolean }) {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>("supplier");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"fixture" | "test" | "live">("fixture");
  const requestKey = useRef<string | null>(null);

  function choose(value: Scenario) {
    requestKey.current = null;
    setScenario(value);
    setValues({});
    setErrors({});
    setFormError("");
    if (mode === "test" && value !== "shipment") setMode("fixture");
    if (mode === "live" && !liveScenarios.includes(value)) setMode("fixture");
  }

  function update(key: string, value: string) {
    requestKey.current = null;
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const nextErrors: Record<string, string> = {};
    for (const field of fields[scenario]) {
      if (!values[field.key]?.trim()) nextErrors[field.key] = "Enter a value before continuing.";
      else if (values[field.key].length > 240) nextErrors[field.key] = "Use 240 characters or fewer.";
    }
    setErrors(nextErrors);
    const firstInvalid = fields[scenario].find((field) => nextErrors[field.key]);
    if (firstInvalid) {
      document.getElementById(firstInvalid.key)?.focus();
      return;
    }
    setPending(true);
    try {
      requestKey.current ||= crypto.randomUUID();
      const response = await fetch("/api/v1/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
        body: JSON.stringify({ scenario, mode, input: values })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "The case was not created. Check the fields and try again.");
      router.push("/app/cases/" + result.case.id);
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "The case was not created. Check the fields and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="new-case-layout">
      <form className="panel case-form" onSubmit={submit} noValidate>
        <fieldset className="scenario-fieldset">
          <legend>Scenario</legend>
          <div className="scenario-options">
            {SCENARIOS.map((item) => (
              <label className={"scenario-option " + (scenario === item ? "is-selected" : "")} key={item}>
                <input type="radio" name="scenario" value={item} checked={scenario === item} onChange={() => choose(item)} />
                <span>{SCENARIO_LABELS[item]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-grid">
          {fields[scenario].map((field) => (
            <div className="form-field" key={field.key}>
              <label className="field-label" htmlFor={field.key}>{field.label}</label>
              {field.key === "changeDescription" ? (
                <textarea
                  className="text-input textarea"
                  id={field.key}
                  rows={3}
                  maxLength={240}
                  value={values[field.key] || ""}
                  onChange={(event) => update(field.key, event.target.value)}
                  aria-invalid={Boolean(errors[field.key])}
                  aria-describedby={field.key + "-help " + field.key + "-error"}
                />
              ) : (
                <input
                  className="text-input"
                  id={field.key}
                  type="text"
                  maxLength={240}
                  autoComplete="off"
                  value={values[field.key] || ""}
                  onChange={(event) => update(field.key, event.target.value)}
                  aria-invalid={Boolean(errors[field.key])}
                  aria-describedby={field.key + "-help " + field.key + "-error"}
                />
              )}
              {field.help && <p className="field-help" id={field.key + "-help"}>{field.help}</p>}
              {errors[field.key] && <p className="field-error" id={field.key + "-error"}>{errors[field.key]}</p>}
            </div>
          ))}
        </div>

        <div className="form-field mode-field">
          <label className="field-label" htmlFor="mode">Environment</label>
          <select className="text-input" id="mode" value={mode} onChange={(event) => setMode(event.target.value === "live" ? "live" : event.target.value === "test" ? "test" : "fixture")}>
            <option value="fixture">Simulated</option>
            <option value="test" disabled={!testShipmentEnabled || scenario !== "shipment"}>Test — EasyPost shipment only</option>
            <option value="live" disabled={!liveScenarios.includes(scenario)}>{scenario === "shipment" ? "Live — EasyPost production" : "Live — SERV + Kite Passport"}</option>
          </select>
          <p className="field-help">{mode === "fixture" ? "Simulated mode uses local data only." : mode === "test" ? "Test mode uses the EasyPost test account. No Kite session is involved." : scenario === "shipment" ? "Live shipment mode sends the tracking code to EasyPost production and may incur account billing." : "Live company mode sends case fields to SERV and requests a user-approved Passport session for one Sirenic registry call."}</p>
        </div>

        <div className="notice-box" role="note">
          {mode === "fixture" ? "This workspace stores case details in the project folder. Creating a simulated case does not contact a provider." : mode === "test" ? "Test shipment tracking sends the provided tracking code and carrier to EasyPost's test API." : scenario === "shipment" ? "Live tracking sends the tracking code and carrier to the EasyPost production API; any provider billing is separate from Kite." : "Live mode sends the fields shown here to SERV. A Sirenic registry request requires a separate Passport session approval and a fresh quote check."}
        </div>
        {formError && <p className="field-error" role="alert">{formError}</p>}
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Creating case" : "Create case"}
        </button>
      </form>

      <aside className="guidance-panel">
        <p className="eyebrow">Before you continue</p>
        <h2>Ask one narrow question</h2>
        <p>Use only the fields needed for the selected scenario. Do not add full bank account details, arbitrary URLs or confidential customer records.</p>
        <div className="guidance-divider" />
        <h3>What happens next</h3>
        <ol>
          <li>{mode === "fixture" ? "Create a case in simulated mode." : `Create a ${mode} case and get a validated SERV plan.`}</li>
          <li>{mode === "fixture" ? "Request a simulated plan or a SERV plan if configured." : scenario === "shipment" ? "Review the carrier status returned by EasyPost." : "Review the Sirenic quote and approve its task-specific Passport session."}</li>
          <li>{mode === "fixture" ? "Run a synthetic fixture and record a human review." : "Inspect the evidence receipt and record a human review."}</li>
        </ol>
        <p className="caption">No invoice is approved or paid by Veyra.</p>
      </aside>
    </div>
  );
}
