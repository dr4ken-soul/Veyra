export const SCENARIOS = ["supplier", "shipment", "registration"] as const;
export type Scenario = (typeof SCENARIOS)[number];
export type Mode = "fixture" | "test" | "live";
export type Verdict = "supported" | "needs_review" | "insufficient_evidence" | "blocked";

export const SCENARIO_LABELS: Record<Scenario, string> = {
  supplier: "Supplier change",
  shipment: "Shipment status",
  registration: "Business registration"
};

export const SCENARIO_QUESTIONS: Record<Scenario, string> = {
  supplier: "What can we establish about this supplier before considering a payment-detail change?",
  shipment: "Does the carrier record support the claimed delivery status?",
  registration: "Is this counterparty currently recorded as active in the supplied jurisdiction?"
};

export const SCENARIO_LIMITATIONS: Record<Scenario, string[]> = {
  supplier: ["A company record does not establish who owns a bank account.", "Veyra does not approve or release invoices."],
  shipment: ["A carrier status does not prove package contents or condition.", "Conflicting or stale events require human review."],
  registration: ["A registry entry is not identity verification, sanctions clearance or a guarantee of solvency.", "Registry data can be incomplete or delayed; confirm important decisions with the official register."]
};

export type InputResult =
  | { ok: true; input: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

const FIELDS: Record<Scenario, string[]> = {
  supplier: ["supplierName", "registrationNumber", "jurisdiction", "changeDescription"],
  shipment: ["carrier", "trackingReference", "claimedStatus"],
  registration: ["registrationNumber", "jurisdiction"]
};

const FIELD_LABELS: Record<string, string> = {
  supplierName: "Supplier name",
  registrationNumber: "Company registration number",
  jurisdiction: "Jurisdiction",
  changeDescription: "What changed?",
  carrier: "Carrier",
  trackingReference: "Tracking reference",
  claimedStatus: "Claimed status"
};

export function validateScenario(value: unknown): value is Scenario {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

export function validateMode(value: unknown): value is Mode {
  return value === "fixture" || value === "test" || value === "live";
}

export function validateScenarioInput(scenario: Scenario, value: unknown): InputResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: { form: "Enter the required details before continuing." } };
  }
  const raw = value as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const allowed = new Set(FIELDS[scenario]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) errors[key] = "This field is not accepted for the selected scenario.";
  }
  const input: Record<string, string> = {};
  for (const key of FIELDS[scenario]) {
    const item = raw[key];
    const label = FIELD_LABELS[key] ?? "This field";
    if (typeof item !== "string") {
      errors[key] = "Enter a value before continuing.";
      continue;
    }
    const cleaned = item.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      errors[key] = "Enter a value before continuing.";
      continue;
    }
    if (cleaned.length > 240) {
      errors[key] = label + " must be 240 characters or fewer.";
      continue;
    }
    if (/[<>]/.test(cleaned)) {
      errors[key] = "Enter plain text without markup.";
      continue;
    }
    input[key] = cleaned;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, input };
}

export function caseQuestion(scenario: Scenario, input: Record<string, string>): string {
  if (scenario === "supplier") {
    return "What company evidence is available for " + input.supplierName + " before a payment-detail change is considered?";
  }
  if (scenario === "shipment") {
    return "Does the carrier record support the claimed status \"" + input.claimedStatus + "\" for " + input.carrier + " reference " + input.trackingReference + "?";
  }
  return "Is the company with registration number " + input.registrationNumber + " currently recorded as active in " + input.jurisdiction + "?";
}

export function expectedCapability(scenario: Scenario): string {
  if (scenario === "shipment") return "carrier_tracking_event";
  return "company_registry_record";
}

export function scenarioEvidenceSummary(scenario: Scenario): string {
  if (scenario === "supplier") return "A synthetic registry-style record can demonstrate the workflow, but cannot establish bank-account ownership.";
  if (scenario === "shipment") return "A synthetic carrier event can demonstrate the workflow, but cannot prove contents or condition.";
  return "A synthetic registration record can demonstrate the workflow, but is not an official registry result.";
}

export function safeReviewNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!note) return null;
  return note.replace(/\b\d{8,}\b/g, "[redacted number]");
}
