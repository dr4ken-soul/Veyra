import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { HttpError } from "@/lib/errors";
import * as localStore from "@/lib/store.local";
import type {
  EvidencePlan,
  EvidenceRecord,
  PaymentRecord,
  PassportSessionRecord,
  VeyraCase
} from "@/lib/store.local";
import type { Scenario, Verdict } from "@/lib/domain";

export type { EvidencePlan, EvidenceRecord, PaymentRecord, PassportSessionRecord, VeyraCase } from "@/lib/store.local";

type StoreConfig = { url: string; key: string; legacyJwt: boolean };
type ApiErrorBody = { code?: unknown; message?: unknown };
type MutationResult = {
  ok: boolean;
  record?: VeyraCase;
  claimed?: boolean;
  status?: number;
  code?: string;
  message?: string;
};
type StoredCase = { record: VeyraCase; request_hash?: string };
type StoredEvent = {
  id: string;
  case_id: string;
  event_type: string;
  mode: string;
  actor_type: string;
  payload_redacted: Record<string, unknown>;
  occurred_at: string;
};

class StoreApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super("Supabase request failed");
  }
}

function config(): StoreConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!process.env.VERCEL && !key) return null;
  if (!url || !key) {
    throw new HttpError(503, "PERSISTENCE_NOT_CONFIGURED", "Set SUPABASE_URL and a server-side SUPABASE_SECRET_KEY before using Veyra on Vercel.");
  }

  let legacyJwt = false;
  if (key.startsWith("sb_secret_")) {
    legacyJwt = false;
  } else if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role !== "service_role") throw new Error("wrong role");
      legacyJwt = true;
    } catch {
      throw new HttpError(503, "INVALID_SUPABASE_KEY", "SUPABASE_SECRET_KEY must be a Supabase secret key or legacy service_role key; a publishable or anon key cannot write Veyra data.");
    }
  } else {
    throw new HttpError(503, "INVALID_SUPABASE_KEY", "SUPABASE_SECRET_KEY must be a Supabase secret key or legacy service_role key; a publishable or anon key cannot write Veyra data.");
  }

  return { url: url.replace(/\/+$/, ""), key, legacyJwt };
}

async function request<T>(store: StoreConfig, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("apikey", store.key);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (store.legacyJwt) headers.set("Authorization", `Bearer ${store.key}`);
  let response: Response;
  try {
    response = await fetch(`${store.url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new HttpError(503, "STORE_UNAVAILABLE", "The Veyra database could not be reached. Try again shortly.");
  }
  if (!response.ok) {
    let errorBody: ApiErrorBody = {};
    try { errorBody = await response.json() as ApiErrorBody; } catch { /* use status-only mapping */ }
    const code = typeof errorBody.code === "string" ? errorBody.code : `HTTP_${response.status}`;
    throw new StoreApiError(response.status, code);
  }
  if (response.status === 204) return null as T;
  return await response.json() as T;
}

function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, value);
  return params.toString();
}

async function findByUnique(store: StoreConfig, orgId: string, column: "idempotency_key" | "external_ref", value: string) {
  const params = query({ select: "record,request_hash", org_id: `eq.${orgId}`, [column]: `eq.${value}`, limit: "1" });
  const rows = await request<StoredCase[]>(store, `veyra_cases?${params}`);
  return rows[0] || null;
}

async function readCase(store: StoreConfig, id: string, orgId: string) {
  const params = query({ select: "record", id: `eq.${id}`, org_id: `eq.${orgId}`, limit: "1" });
  const rows = await request<StoredCase[]>(store, `veyra_cases?${params}`);
  return rows[0]?.record || null;
}

function throwMutationError(result: MutationResult): never {
  throw new HttpError(result.status || 500, result.code || "STORE_ERROR", result.message || "The requested case update could not be saved.");
}

async function mutate(store: StoreConfig, orgId: string, caseId: string, action: string, payload: Record<string, unknown>) {
  const result = await request<MutationResult>(store, "rpc/veyra_mutate_case", {
    method: "POST",
    body: JSON.stringify({
      p_org_id: orgId,
      p_case_id: caseId,
      p_action: action,
      p_payload: payload,
      p_event_id: randomUUID(),
      p_event_at: new Date().toISOString()
    })
  });
  if (!result.ok || !result.record) throwMutationError(result);
  return result;
}

function decisionReason(scenario: Scenario, mode: string) {
  if (mode === "fixture") {
    if (scenario === "supplier") return "The synthetic company record does not establish who owns the bank account. Review the change before paying the invoice.";
    if (scenario === "shipment") return "The synthetic carrier event does not prove what the package contained or its condition.";
    return "The synthetic record is not an official registry result. Verify the status with an approved source.";
  }
  if (scenario === "supplier") return "The registry result identifies the legal entity only. It does not verify bank-account ownership, so keep the invoice on hold for human review.";
  if (scenario === "shipment") return "The carrier record reports a tracking status only. It does not establish package contents or condition; review exceptions with the carrier.";
  return "The provider returned an official-register profile. Confirm the live status directly with the linked register before relying on it.";
}

export async function createCaseRecord(args: {
  orgId: string; scenario: Scenario; mode: "fixture" | "test" | "live"; input: Record<string, string>; question: string;
  externalRef: string | null; idempotencyKey: string | null;
}) {
  const store = config();
  if (!store) return localStore.createCaseRecord(args);
  const requestHash = createHash("sha256").update(JSON.stringify({
    scenario: args.scenario, input: args.input, question: args.question, mode: args.mode
  })).digest("hex");

  if (args.idempotencyKey) {
    const existing = await findByUnique(store, args.orgId, "idempotency_key", args.idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different request.");
      return { record: existing.record, replayed: true };
    }
  }
  if (args.externalRef && await findByUnique(store, args.orgId, "external_ref", args.externalRef)) {
    throw new HttpError(409, "EXTERNAL_REF_CONFLICT", "A case with this external reference already exists.");
  }

  const now = new Date().toISOString();
  const record: VeyraCase = {
    id: randomUUID(), orgId: args.orgId, scenario: args.scenario, mode: args.mode, state: "draft",
    question: args.question, input: args.input, createdAt: now, updatedAt: now,
    plan: null, planMode: null, servRequestId: null, model: null, evidence: null,
    operationId: null, operationState: null, payment: null, passportSession: null,
    verdict: null, decisionReason: null, reviewedAt: null, reviewAction: null, reviewNote: null
  };

  try {
    const result = await request<MutationResult>(store, "rpc/veyra_create_case", {
      method: "POST",
      body: JSON.stringify({
        p_id: record.id, p_org_id: args.orgId, p_scenario: args.scenario, p_mode: args.mode,
        p_external_ref: args.externalRef, p_idempotency_key: args.idempotencyKey,
        p_request_hash: requestHash, p_record: record, p_event_id: randomUUID(), p_event_at: now
      })
    });
    if (!result.ok || !result.record) throwMutationError(result);
    return { record: result.record, replayed: false };
  } catch (error) {
    if (!(error instanceof StoreApiError) || error.code !== "23505") throw error;
    if (args.idempotencyKey) {
      const existing = await findByUnique(store, args.orgId, "idempotency_key", args.idempotencyKey);
      if (existing) {
        if (existing.request_hash !== requestHash) throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different request.");
        return { record: existing.record, replayed: true };
      }
    }
    throw new HttpError(409, "EXTERNAL_REF_CONFLICT", "A case with this external reference already exists.");
  }
}

export async function getCaseRecord(id: string, orgId: string) {
  const store = config();
  return store ? readCase(store, id, orgId) : localStore.getCaseRecord(id, orgId);
}

export async function listCaseRecords(orgId: string, filters: { scenario?: string; state?: string; mode?: string } = {}) {
  const store = config();
  if (!store) return localStore.listCaseRecords(orgId, filters);
  const params = query({
    select: "record", org_id: `eq.${orgId}`,
    scenario: filters.scenario ? `eq.${filters.scenario}` : undefined,
    state: filters.state ? `eq.${filters.state}` : undefined,
    mode: filters.mode ? `eq.${filters.mode}` : undefined,
    order: "created_at.desc", limit: "100"
  });
  const rows = await request<StoredCase[]>(store, `veyra_cases?${params}`);
  return rows.map((row) => row.record);
}

export async function saveEvidencePlan(args: {
  orgId: string; caseId: string; plan: EvidencePlan; reasoningMode: "serv" | "simulated";
  requestId: string | null; model: string | null;
}) {
  const store = config();
  if (!store) return localStore.saveEvidencePlan(args);
  const current = await readCase(store, args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  const updatedAt = new Date().toISOString();
  return (await mutate(store, args.orgId, args.caseId, "save_plan", {
    reasoningMode: args.reasoningMode,
    requestId: args.requestId,
    model: args.model,
    patch: { plan: args.plan, planMode: args.reasoningMode, servRequestId: args.requestId, model: args.model, state: "planned", updatedAt }
  })).record;
}

function matchedSubject(record: VeyraCase) {
  return record.input.supplierName ||
    (record.input.carrier ? `${record.input.carrier} ${record.input.trackingReference}` : "") ||
    record.input.registrationNumber || "Scenario subject";
}

export async function runFixtureEvidence(orgId: string, caseId: string) {
  const store = config();
  if (!store) return localStore.runFixtureEvidence(orgId, caseId);
  const current = await readCase(store, caseId, orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!current.plan) throw new HttpError(409, "PLAN_REQUIRED", "Create and validate an evidence plan before retrieving evidence.");
  if (current.mode !== "fixture") throw new HttpError(403, "MODE_BLOCKED", "This operation requires a configured live evidence adapter.");
  if (current.evidence) return current;

  const now = new Date().toISOString();
  const id = randomUUID();
  const operationId = randomUUID();
  const subject = matchedSubject(current);
  const limitations = current.scenario === "supplier"
    ? ["Synthetic record only. It does not establish bank-account ownership.", "No invoice or bank action is performed."]
    : current.scenario === "shipment"
      ? ["Synthetic carrier event only. It does not prove package contents or condition."]
      : ["Synthetic registration-style record only. It is not an official registry result."];
  const payload = {
    fixture: true,
    status: current.scenario === "shipment" ? "simulated_delivery_event" : "simulated_registry_record",
    matchedSubject: subject,
    sourceTimestamp: null,
    summary: "Synthetic demonstration data. No external provider was called."
  };
  const digestSha256 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const evidence: EvidenceRecord = {
    id, operationId, sourceName: "Synthetic scenario fixture", operatorName: "Veyra fixture adapter",
    upstreamName: "Synthetic demonstration data", retrievedAt: now, sourceTimestamp: null,
    matchedSubject: subject, payload, digestSha256, limitations
  };
  const state = current.scenario === "registration" ? "insufficient_evidence" : "needs_review";
  const payment: PaymentRecord = {
    state: "simulated", amountMinor: null, asset: null, network: null, transactionRef: null,
    confirmationRef: null, confirmedAt: null
  };
  const result = await mutate(store, orgId, caseId, "fixture_evidence", {
    patch: {
      evidence, operationId, operationState: "evidence_received", payment, state,
      verdict: state as Verdict, decisionReason: decisionReason(current.scenario, current.mode), updatedAt: now
    },
    eventPayload: { mode: "fixture", paymentState: "simulated", evidenceId: id }
  });
  return result.record;
}

export async function savePassportSession(args: { orgId: string; caseId: string; session: PassportSessionRecord }) {
  const store = config();
  if (!store) return localStore.savePassportSession(args);
  const current = await readCase(store, args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (current.mode !== "live") throw new HttpError(409, "LIVE_MODE_REQUIRED", "Passport sessions are available only for live cases.");
  if (current.evidence || current.operationId) throw new HttpError(409, "OPERATION_ALREADY_STARTED", "This case already has an evidence operation.");
  const updatedAt = new Date().toISOString();
  return (await mutate(store, args.orgId, args.caseId, "save_passport_session", {
    patch: { passportSession: args.session, updatedAt },
    eventPayload: {
      requestId: args.session.requestId, state: args.session.state,
      maxPerTransaction: args.session.maxPerTransaction, maxTotal: args.session.maxTotal
    }
  })).record;
}

export async function updatePassportSession(args: {
  orgId: string; caseId: string; session: Partial<PassportSessionRecord> & Pick<PassportSessionRecord, "state">;
}) {
  const store = config();
  if (!store) return localStore.updatePassportSession(args);
  const current = await readCase(store, args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!current.passportSession) throw new HttpError(404, "SESSION_NOT_FOUND", "This case has no Passport session request.");
  const next = { ...current.passportSession, ...args.session };
  const updatedAt = new Date().toISOString();
  return (await mutate(store, args.orgId, args.caseId, "update_passport_session", {
    session: next,
    eventPayload: { requestId: current.passportSession.requestId, state: next.state },
    updatedAt
  })).record;
}

export async function claimProviderOperation(orgId: string, caseId: string, mode: "test" | "live") {
  const store = config();
  if (!store) return localStore.claimProviderOperation(orgId, caseId, mode);
  const current = await readCase(store, caseId, orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  const operationId = randomUUID();
  const updatedAt = new Date().toISOString();
  const payment: PaymentRecord = {
    state: "unknown", amountMinor: null, asset: null, network: null, transactionRef: null,
    confirmationRef: null, confirmedAt: null
  };
  const sessionId = current.passportSession?.sessionId || null;
  const result = await mutate(store, orgId, caseId, "claim_provider_operation", {
    mode,
    patch: { operationId, operationState: "in_progress", state: "in_progress", payment, updatedAt },
    eventPayload: { operationId, sessionId }
  });
  const updated = result.record!;
  return { record: updated, operationId: updated.operationId, claimed: result.claimed === true };
}

export async function markProviderOperationUnknown(orgId: string, caseId: string, operationId: string, mode: "test" | "live") {
  const store = config();
  if (!store) return localStore.markProviderOperationUnknown(orgId, caseId, operationId, mode);
  const now = new Date().toISOString();
  const payment: PaymentRecord = {
    state: "unknown", amountMinor: null, asset: null, network: null, transactionRef: null,
    confirmationRef: null, confirmedAt: null
  };
  return (await mutate(store, orgId, caseId, "mark_operation_unknown", {
    operationId,
    patch: { operationState: "payment_unknown", payment, state: "blocked", updatedAt: now },
    eventPayload: { operationId }
  })).record;
}

export async function completeProviderOperation(args: {
  orgId: string; caseId: string; operationId: string; mode: "test" | "live";
  sourceName: string; operatorName: string; upstreamName: string; sourceTimestamp: string | null;
  matchedSubject: string; payload: Record<string, unknown>; limitations: string[]; payment: PaymentRecord;
}) {
  const store = config();
  if (!store) return localStore.completeProviderOperation(args);
  const current = await readCase(store, args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (current.mode !== args.mode) throw new HttpError(409, "MODE_REQUIRED", `This case is not in ${args.mode} mode.`);
  if (current.evidence) return current;
  const now = new Date().toISOString();
  const digestSha256 = createHash("sha256").update(JSON.stringify(args.payload)).digest("hex");
  const evidence: EvidenceRecord = {
    id: randomUUID(), operationId: args.operationId, sourceName: args.sourceName,
    operatorName: args.operatorName, upstreamName: args.upstreamName, retrievedAt: now,
    sourceTimestamp: args.sourceTimestamp, matchedSubject: args.matchedSubject,
    payload: args.payload, digestSha256, limitations: args.limitations
  };
  return (await mutate(store, args.orgId, args.caseId, "complete_provider_operation", {
    mode: args.mode,
    operationId: args.operationId,
    patch: {
      evidence, payment: args.payment, state: "needs_review", verdict: "needs_review",
      decisionReason: decisionReason(current.scenario, current.mode), operationState: "evidence_received", updatedAt: now
    },
    eventPayload: { mode: args.mode, paymentState: args.payment.state, evidenceId: evidence.id, digestSha256 }
  })).record;
}

export async function recordHumanReview(args: { orgId: string; caseId: string; action: string; note: string | null; reviewerId: string }) {
  const store = config();
  if (!store) return localStore.recordHumanReview(args);
  const current = await readCase(store, args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  const reviewedAt = new Date().toISOString();
  return (await mutate(store, args.orgId, args.caseId, "record_review", {
    action: args.action,
    patch: { reviewAction: args.action, reviewNote: args.note, reviewedAt, updatedAt: reviewedAt },
    eventPayload: { action: args.action, notePresent: Boolean(args.note) }
  })).record;
}

export async function listActivity(orgId: string, caseId?: string) {
  const store = config();
  if (!store) return localStore.listActivity(orgId, caseId);
  const params = query({
    select: "id,case_id,event_type,mode,actor_type,payload_redacted,occurred_at",
    org_id: `eq.${orgId}`, case_id: caseId ? `eq.${caseId}` : undefined,
    order: "occurred_at.desc", limit: "200"
  });
  const rows = await request<StoredEvent[]>(store, `veyra_events?${params}`);
  return rows.map((row) => ({
    id: row.id, caseId: row.case_id, eventType: row.event_type, mode: row.mode,
    actorType: row.actor_type, payload: row.payload_redacted, occurredAt: row.occurred_at
  }));
}

export async function getReceipt(orgId: string, caseId: string) {
  const record = await getCaseRecord(caseId, orgId);
  if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!record.evidence) throw new HttpError(404, "RECEIPT_NOT_READY", "No evidence receipt is available for this case.");
  return {
    caseId: record.id, mode: record.mode, evidence: record.evidence, payment: record.payment,
    verdict: record.verdict, reason: record.decisionReason, limitations: record.evidence.limitations,
    serv: record.planMode === "serv" ? { requestId: record.servRequestId, model: record.model } : { state: "simulated" }
  };
}
