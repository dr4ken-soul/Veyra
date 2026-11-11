import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { HttpError } from "@/lib/errors";
import type { Mode, Scenario, Verdict } from "@/lib/domain";

export type EvidencePlan = {
  missingQuestion: string;
  capability: string;
  rationale: string;
  expectedEvidence: string;
  limitations: string[];
  expectedCost: "Not confirmed";
  providerStatus: "Not configured";
};
export type EvidenceRecord = {
  id: string;
  operationId: string;
  sourceName: string;
  operatorName: string;
  upstreamName: string;
  retrievedAt: string;
  sourceTimestamp: string | null;
  matchedSubject: string;
  payload: Record<string, unknown>;
  digestSha256: string;
  limitations: string[];
};
export type PaymentRecord = {
  state: "simulated" | "not_started" | "not_required" | "pending" | "confirmed" | "unknown" | "account_billed";
  amountMinor: string | null;
  asset: string | null;
  network: string | null;
  transactionRef: string | null;
  confirmationRef: string | null;
  confirmedAt: string | null;
};
export type PassportSessionRecord = {
  requestId: string;
  sessionId: string | null;
  approvalUrl: string | null;
  state: "approval_required" | "active" | "expired" | "rejected" | "unknown";
  maxPerTransaction: string;
  maxTotal: string;
  expiresAt: string | null;
  quote: { amount: string; asset: string; network: string; recipient: string | null };
};
export type VeyraCase = {
  id: string;
  orgId: string;
  scenario: Scenario;
  mode: Mode;
  state: string;
  question: string;
  input: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  plan: EvidencePlan | null;
  planMode: "serv" | "simulated" | null;
  servRequestId: string | null;
  model: string | null;
  evidence: EvidenceRecord | null;
  operationId: string | null;
  payment: PaymentRecord | null;
  passportSession: PassportSessionRecord | null;
  verdict: Verdict | null;
  decisionReason: string | null;
  reviewedAt: string | null;
  reviewAction: string | null;
  reviewNote: string | null;
};
type DbRow = Record<string, unknown>;
type GlobalWithDb = typeof globalThis & { __veyraDb?: DatabaseSync };

function database() {
  const globalDb = globalThis as GlobalWithDb;
  if (globalDb.__veyraDb) return globalDb.__veyraDb;
  const configuredName = path.basename(process.env.DATABASE_PATH || "veyra.sqlite");
  const dbRoot = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
  const dbPath = path.join(dbRoot, configuredName);
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec([
    "CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, scenario TEXT NOT NULL CHECK(scenario IN ('supplier','shipment','registration')), mode TEXT NOT NULL CHECK(mode IN ('fixture','test','live')), state TEXT NOT NULL, question TEXT NOT NULL, input_json TEXT NOT NULL, external_ref TEXT, idempotency_key TEXT, request_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(org_id, idempotency_key), UNIQUE(org_id, external_ref))",
    "CREATE INDEX IF NOT EXISTS cases_org_created ON cases(org_id, created_at DESC)",
    "CREATE TABLE IF NOT EXISTS plans (case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE, reasoning_mode TEXT NOT NULL CHECK(reasoning_mode IN ('serv','simulated')), request_id TEXT, model TEXT, plan_json TEXT NOT NULL, created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE, source_name TEXT NOT NULL, operator_name TEXT NOT NULL, upstream_name TEXT NOT NULL, retrieved_at TEXT NOT NULL, source_timestamp TEXT, matched_subject TEXT NOT NULL, payload_json TEXT NOT NULL, digest_sha256 TEXT NOT NULL, limitations_json TEXT NOT NULL, created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE, state TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('fixture','test','live')), payment_state TEXT NOT NULL, evidence_state TEXT NOT NULL, created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS receipts (case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE, payment_state TEXT NOT NULL, amount_minor TEXT, asset TEXT, network TEXT, transaction_ref TEXT, confirmation_ref TEXT, confirmed_at TEXT)",
    "CREATE TABLE IF NOT EXISTS passport_sessions (case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE, request_id TEXT NOT NULL UNIQUE, session_id TEXT, approval_url TEXT, state TEXT NOT NULL, max_per_tx TEXT NOT NULL, max_total TEXT NOT NULL, expires_at TEXT, quote_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS reviews (case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE, action TEXT NOT NULL, note TEXT, reviewed_at TEXT NOT NULL, reviewer_id TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, event_type TEXT NOT NULL, mode TEXT NOT NULL, actor_type TEXT NOT NULL, payload_redacted TEXT NOT NULL, occurred_at TEXT NOT NULL)",
    "CREATE INDEX IF NOT EXISTS events_org_case_time ON events(org_id, case_id, occurred_at DESC)"
  ].join(";\n") + ";");
  globalDb.__veyraDb = db;
  return db;
}

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
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

function rowToCase(row: DbRow | undefined, orgId: string): VeyraCase | null {
  if (!row || typeof row.id !== "string") return null;
  const db = database();
  const id = row.id;
  const planRow = db.prepare("SELECT reasoning_mode, request_id, model, plan_json FROM plans WHERE case_id = ?").get(id) as DbRow | undefined;
  const evidenceRow = db.prepare("SELECT * FROM evidence WHERE case_id = ?").get(id) as DbRow | undefined;
  const operationRow = db.prepare("SELECT id FROM operations WHERE case_id = ?").get(id) as DbRow | undefined;
  const receiptRow = db.prepare("SELECT * FROM receipts WHERE case_id = ?").get(id) as DbRow | undefined;
  const passportRow = db.prepare("SELECT * FROM passport_sessions WHERE case_id = ?").get(id) as DbRow | undefined;
  const reviewRow = db.prepare("SELECT * FROM reviews WHERE case_id = ?").get(id) as DbRow | undefined;
  const evidence = evidenceRow ? {
    id: String(evidenceRow.id),
    operationId: String(operationRow?.id || ""),
    sourceName: String(evidenceRow.source_name),
    operatorName: String(evidenceRow.operator_name),
    upstreamName: String(evidenceRow.upstream_name),
    retrievedAt: String(evidenceRow.retrieved_at),
    sourceTimestamp: typeof evidenceRow.source_timestamp === "string" ? evidenceRow.source_timestamp : null,
    matchedSubject: String(evidenceRow.matched_subject),
    payload: parse<Record<string, unknown>>(evidenceRow.payload_json, {}),
    digestSha256: String(evidenceRow.digest_sha256),
    limitations: parse<string[]>(evidenceRow.limitations_json, [])
  } satisfies EvidenceRecord : null;
  const payment = receiptRow ? {
    state: String(receiptRow.payment_state) as PaymentRecord["state"],
    amountMinor: typeof receiptRow.amount_minor === "string" ? receiptRow.amount_minor : null,
    asset: typeof receiptRow.asset === "string" ? receiptRow.asset : null,
    network: typeof receiptRow.network === "string" ? receiptRow.network : null,
    transactionRef: typeof receiptRow.transaction_ref === "string" ? receiptRow.transaction_ref : null,
    confirmationRef: typeof receiptRow.confirmation_ref === "string" ? receiptRow.confirmation_ref : null,
    confirmedAt: typeof receiptRow.confirmed_at === "string" ? receiptRow.confirmed_at : null
  } satisfies PaymentRecord : null;
  const passportSession: PassportSessionRecord | null = passportRow ? {
    requestId: String(passportRow.request_id),
    sessionId: typeof passportRow.session_id === "string" ? passportRow.session_id : null,
    approvalUrl: typeof passportRow.approval_url === "string" ? passportRow.approval_url : null,
    state: String(passportRow.state) as PassportSessionRecord["state"],
    maxPerTransaction: String(passportRow.max_per_tx),
    maxTotal: String(passportRow.max_total),
    expiresAt: typeof passportRow.expires_at === "string" ? passportRow.expires_at : null,
    quote: parse(passportRow.quote_json, { amount: "unknown", asset: "unknown", network: "unknown", recipient: null })
  } : null;
  const scenario = String(row.scenario) as Scenario;
  return {
    id, orgId, scenario,
    mode: String(row.mode) as Mode,
    state: String(row.state),
    question: String(row.question),
    input: parse<Record<string, string>>(row.input_json, {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    plan: planRow ? parse<EvidencePlan>(planRow.plan_json, null as unknown as EvidencePlan) : null,
    planMode: planRow ? String(planRow.reasoning_mode) as "serv" | "simulated" : null,
    servRequestId: planRow && typeof planRow.request_id === "string" ? planRow.request_id : null,
    model: planRow && typeof planRow.model === "string" ? planRow.model : null,
    evidence, operationId: operationRow && typeof operationRow.id === "string" ? operationRow.id : null, payment, passportSession,
    verdict: evidence ? String(row.state) as Verdict : null,
    decisionReason: evidence ? decisionReason(scenario, String(row.mode)) : null,
    reviewedAt: reviewRow && typeof reviewRow.reviewed_at === "string" ? reviewRow.reviewed_at : null,
    reviewAction: reviewRow && typeof reviewRow.action === "string" ? reviewRow.action : null,
    reviewNote: reviewRow && typeof reviewRow.note === "string" ? reviewRow.note : null
  };
}

function addEvent(db: DatabaseSync, orgId: string, caseId: string, eventType: string, payload: Record<string, unknown>, mode: Mode = "fixture") {
  db.prepare("INSERT INTO events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at) VALUES (?, ?, ?, ?, ?, 'user', ?, ?)")
    .run(randomUUID(), orgId, caseId, eventType, mode, JSON.stringify(payload), new Date().toISOString());
}

export function createCaseRecord(args: {
  orgId: string; scenario: Scenario; mode: Mode; input: Record<string, string>; question: string;
  externalRef: string | null; idempotencyKey: string | null;
}) {
  const db = database();
  const bodyDigest = createHash("sha256").update(JSON.stringify({
    scenario: args.scenario, input: args.input, question: args.question, mode: args.mode
  })).digest("hex");
  if (args.idempotencyKey) {
    const existing = db.prepare("SELECT * FROM cases WHERE org_id = ? AND idempotency_key = ?")
      .get(args.orgId, args.idempotencyKey) as DbRow | undefined;
    if (existing) {
      if (existing.request_hash !== bodyDigest) throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different request.");
      const result = rowToCase(existing, args.orgId);
      if (!result) throw new HttpError(500, "STORE_ERROR", "The case could not be loaded.");
      return { record: result, replayed: true };
    }
  }
  if (args.externalRef) {
    const duplicateRef = db.prepare("SELECT id FROM cases WHERE org_id = ? AND external_ref = ?").get(args.orgId, args.externalRef);
    if (duplicateRef) throw new HttpError(409, "EXTERNAL_REF_CONFLICT", "A case with this external reference already exists.");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO cases (id, org_id, scenario, mode, state, question, input_json, external_ref, idempotency_key, request_hash, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)")
      .run(id, args.orgId, args.scenario, args.mode, args.question, JSON.stringify(args.input), args.externalRef, args.idempotencyKey, bodyDigest, now, now);
    addEvent(db, args.orgId, id, "case.created", { scenario: args.scenario, mode: args.mode }, args.mode);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  const record = getCaseRecord(id, args.orgId);
  if (!record) throw new HttpError(500, "STORE_ERROR", "The case could not be loaded.");
  return { record, replayed: false };
}

export function getCaseRecord(id: string, orgId: string) {
  const row = database().prepare("SELECT * FROM cases WHERE id = ? AND org_id = ?").get(id, orgId) as DbRow | undefined;
  return rowToCase(row, orgId);
}

export function listCaseRecords(orgId: string, filters: { scenario?: string; state?: string; mode?: string } = {}) {
  const clauses = ["org_id = ?"];
  const values: (string | number | null)[] = [orgId];
  if (filters.scenario) { clauses.push("scenario = ?"); values.push(filters.scenario); }
  if (filters.state) { clauses.push("state = ?"); values.push(filters.state); }
  if (filters.mode) { clauses.push("mode = ?"); values.push(filters.mode); }
  const rows = database().prepare("SELECT * FROM cases WHERE " + clauses.join(" AND ") + " ORDER BY created_at DESC LIMIT 100")
    .all(...values) as DbRow[];
  return rows.map((row) => rowToCase(row, orgId)).filter((item): item is VeyraCase => Boolean(item));
}

export function saveEvidencePlan(args: {
  orgId: string; caseId: string; plan: EvidencePlan; reasoningMode: "serv" | "simulated";
  requestId: string | null; model: string | null;
}) {
  const db = database();
  if (!getCaseRecord(args.caseId, args.orgId)) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT OR REPLACE INTO plans (case_id, reasoning_mode, request_id, model, plan_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(args.caseId, args.reasoningMode, args.requestId, args.model, JSON.stringify(args.plan), now);
    db.prepare("UPDATE cases SET state = 'planned', updated_at = ? WHERE id = ? AND org_id = ?").run(now, args.caseId, args.orgId);
    addEvent(db, args.orgId, args.caseId, "plan.validated", { reasoningMode: args.reasoningMode, requestId: args.requestId, model: args.model });
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getCaseRecord(args.caseId, args.orgId);
}

function matchedSubject(record: VeyraCase) {
  return record.input.supplierName ||
    (record.input.carrier ? record.input.carrier + " " + record.input.trackingReference : "") ||
    record.input.registrationNumber ||
    "Scenario subject";
}

export function runFixtureEvidence(orgId: string, caseId: string) {
  const db = database();
  const current = getCaseRecord(caseId, orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!current.plan) throw new HttpError(409, "PLAN_REQUIRED", "Create and validate an evidence plan before retrieving evidence.");
  if (current.mode !== "fixture") throw new HttpError(403, "MODE_BLOCKED", "This operation requires a configured live evidence adapter.");
  if (current.evidence) return current;

  const id = randomUUID();
  const operationId = randomUUID();
  const now = new Date().toISOString();
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
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT id FROM evidence WHERE case_id = ?").get(caseId)) {
      db.exec("COMMIT");
      return getCaseRecord(caseId, orgId);
    }
    db.prepare("INSERT INTO operations (id, case_id, state, mode, payment_state, evidence_state, created_at) VALUES (?, ?, 'evidence_received', 'fixture', 'simulated', 'received', ?)").run(operationId, caseId, now);
    db.prepare("INSERT INTO evidence (id, case_id, source_name, operator_name, upstream_name, retrieved_at, source_timestamp, matched_subject, payload_json, digest_sha256, limitations_json, created_at) VALUES (?, ?, 'Synthetic scenario fixture', 'Veyra fixture adapter', 'Synthetic demonstration data', ?, NULL, ?, ?, ?, ?, ?)")
      .run(id, caseId, now, subject, JSON.stringify(payload), digest, JSON.stringify(limitations), now);
    db.prepare("INSERT INTO receipts (case_id, payment_state, amount_minor, asset, network, transaction_ref, confirmation_ref, confirmed_at) VALUES (?, 'simulated', NULL, NULL, NULL, NULL, NULL, NULL)")
      .run(caseId);
    const nextState = current.scenario === "registration" ? "insufficient_evidence" : "needs_review";
    db.prepare("UPDATE cases SET state = ?, updated_at = ? WHERE id = ? AND org_id = ?").run(nextState, now, caseId, orgId);
    addEvent(db, orgId, caseId, "fixture.evidence_returned", { mode: "fixture", paymentState: "simulated", evidenceId: id });
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getCaseRecord(caseId, orgId);
}

export function savePassportSession(args: {
  orgId: string;
  caseId: string;
  session: PassportSessionRecord;
}) {
  const db = database();
  const record = getCaseRecord(args.caseId, args.orgId);
  if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (record.mode !== "live") throw new HttpError(409, "LIVE_MODE_REQUIRED", "Passport sessions are available only for live cases.");
  if (record.evidence || db.prepare("SELECT id FROM operations WHERE case_id = ?").get(args.caseId)) {
    throw new HttpError(409, "OPERATION_ALREADY_STARTED", "This case already has an evidence operation.");
  }
  const now = new Date().toISOString();
  db.prepare("INSERT INTO passport_sessions (case_id, request_id, session_id, approval_url, state, max_per_tx, max_total, expires_at, quote_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET request_id = excluded.request_id, session_id = excluded.session_id, approval_url = excluded.approval_url, state = excluded.state, max_per_tx = excluded.max_per_tx, max_total = excluded.max_total, expires_at = excluded.expires_at, quote_json = excluded.quote_json, updated_at = excluded.updated_at")
    .run(args.caseId, args.session.requestId, args.session.sessionId, args.session.approvalUrl, args.session.state, args.session.maxPerTransaction, args.session.maxTotal, args.session.expiresAt, JSON.stringify(args.session.quote), now);
  addEvent(db, args.orgId, args.caseId, "passport.session_requested", { requestId: args.session.requestId, state: args.session.state, maxPerTransaction: args.session.maxPerTransaction, maxTotal: args.session.maxTotal }, "live");
  return getCaseRecord(args.caseId, args.orgId);
}

export function updatePassportSession(args: {
  orgId: string;
  caseId: string;
  session: Partial<PassportSessionRecord> & Pick<PassportSessionRecord, "state">;
}) {
  const db = database();
  const record = getCaseRecord(args.caseId, args.orgId);
  if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!record.passportSession) throw new HttpError(404, "SESSION_NOT_FOUND", "This case has no Passport session request.");
  const current = record.passportSession;
  const next = { ...current, ...args.session };
  db.prepare("UPDATE passport_sessions SET session_id = ?, approval_url = ?, state = ?, max_per_tx = ?, max_total = ?, expires_at = ?, updated_at = ? WHERE case_id = ?")
    .run(next.sessionId, next.approvalUrl, next.state, next.maxPerTransaction, next.maxTotal, next.expiresAt, new Date().toISOString(), args.caseId);
  addEvent(db, args.orgId, args.caseId, "passport.session_status", { requestId: current.requestId, state: next.state }, "live");
  return getCaseRecord(args.caseId, args.orgId);
}

export function claimProviderOperation(orgId: string, caseId: string, mode: "test" | "live") {
  const db = database();
  const current = getCaseRecord(caseId, orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (current.mode !== mode) throw new HttpError(409, "MODE_REQUIRED", `This case is not in ${mode} mode.`);
  if (!current.plan || current.planMode !== "serv") throw new HttpError(409, "SERV_PLAN_REQUIRED", "Create a validated SERV plan before retrieving provider evidence.");
  if (current.scenario !== "shipment" && (!current.passportSession || current.passportSession.state !== "active" || !current.passportSession.sessionId)) {
    throw new HttpError(409, "ACTIVE_SESSION_REQUIRED", "Approve an active task-specific Passport session before running this paid request.");
  }
  if (current.evidence) return { record: current, operationId: current.operationId, claimed: false };
  const existing = db.prepare("SELECT id, state FROM operations WHERE case_id = ?").get(caseId) as DbRow | undefined;
  if (existing) throw new HttpError(409, "OPERATION_ALREADY_STARTED", "A live request has already started for this case. Check its status before taking further action.");
  const id = randomUUID();
  const now = new Date().toISOString();
  const sessionId = current.passportSession?.sessionId || null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO operations (id, case_id, state, mode, payment_state, evidence_state, created_at) VALUES (?, ?, 'in_progress', ?, 'unknown', 'pending', ?)").run(id, caseId, mode, now);
    db.prepare("INSERT INTO receipts (case_id, payment_state, amount_minor, asset, network, transaction_ref, confirmation_ref, confirmed_at) VALUES (?, 'unknown', NULL, NULL, NULL, NULL, NULL, NULL)").run(caseId);
    db.prepare("UPDATE cases SET state = 'in_progress', updated_at = ? WHERE id = ? AND org_id = ?").run(now, caseId, orgId);
    addEvent(db, orgId, caseId, `${mode}.operation_started`, { operationId: id, sessionId }, mode);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return { record: getCaseRecord(caseId, orgId), operationId: id, claimed: true };
}

export function markProviderOperationUnknown(orgId: string, caseId: string, operationId: string, mode: "test" | "live") {
  const db = database();
  db.prepare("UPDATE operations SET state = 'payment_unknown', payment_state = 'unknown', evidence_state = 'unknown' WHERE id = ? AND case_id = ?")
    .run(operationId, caseId);
  db.prepare("UPDATE receipts SET payment_state = 'unknown' WHERE case_id = ?").run(caseId);
  db.prepare("UPDATE cases SET state = 'blocked', updated_at = ? WHERE id = ? AND org_id = ?")
    .run(new Date().toISOString(), caseId, orgId);
  addEvent(db, orgId, caseId, `${mode}.operation_result_unknown`, { operationId }, mode);
  return getCaseRecord(caseId, orgId);
}

export function completeProviderOperation(args: {
  orgId: string;
  caseId: string;
  operationId: string;
  mode: "test" | "live";
  sourceName: string;
  operatorName: string;
  upstreamName: string;
  sourceTimestamp: string | null;
  matchedSubject: string;
  payload: Record<string, unknown>;
  limitations: string[];
  payment: PaymentRecord;
}) {
  const db = database();
  const current = getCaseRecord(args.caseId, args.orgId);
  if (!current) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (current.mode !== args.mode) throw new HttpError(409, "MODE_REQUIRED", `This case is not in ${args.mode} mode.`);
  if (current.evidence) return current;
  const operation = db.prepare("SELECT id, state FROM operations WHERE id = ? AND case_id = ?").get(args.operationId, args.caseId) as DbRow | undefined;
  if (!operation || operation.state !== "in_progress") throw new HttpError(409, "OPERATION_NOT_ACTIVE", "The live operation is not in a state that can accept a result.");
  const id = randomUUID();
  const now = new Date().toISOString();
  const payloadText = JSON.stringify(args.payload);
  const digest = createHash("sha256").update(payloadText).digest("hex");
  const nextState = "needs_review";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO evidence (id, case_id, source_name, operator_name, upstream_name, retrieved_at, source_timestamp, matched_subject, payload_json, digest_sha256, limitations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, args.caseId, args.sourceName, args.operatorName, args.upstreamName, now, args.sourceTimestamp, args.matchedSubject, payloadText, digest, JSON.stringify(args.limitations), now);
    db.prepare("UPDATE receipts SET payment_state = ?, amount_minor = ?, asset = ?, network = ?, transaction_ref = ?, confirmation_ref = ?, confirmed_at = ? WHERE case_id = ?")
      .run(args.payment.state, args.payment.amountMinor, args.payment.asset, args.payment.network, args.payment.transactionRef, args.payment.confirmationRef, args.payment.confirmedAt, args.caseId);
    db.prepare("UPDATE operations SET state = 'evidence_received', payment_state = ?, evidence_state = 'received' WHERE id = ? AND case_id = ?")
      .run(args.payment.state, args.operationId, args.caseId);
    db.prepare("UPDATE cases SET state = ?, updated_at = ? WHERE id = ? AND org_id = ?").run(nextState, now, args.caseId, args.orgId);
    addEvent(db, args.orgId, args.caseId, `${args.mode}.evidence_returned`, { mode: args.mode, paymentState: args.payment.state, evidenceId: id, digestSha256: digest }, args.mode);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getCaseRecord(args.caseId, args.orgId);
}

export function recordHumanReview(args: { orgId: string; caseId: string; action: string; note: string | null; reviewerId: string }) {
  const db = database();
  if (!getCaseRecord(args.caseId, args.orgId)) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  const allowed = new Set(["request_more_evidence", "keep_on_hold", "close_review"]);
  if (!allowed.has(args.action)) throw new HttpError(422, "INVALID_REVIEW_ACTION", "Choose a supported review action.");
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT OR REPLACE INTO reviews (case_id, action, note, reviewed_at, reviewer_id) VALUES (?, ?, ?, ?, ?)")
      .run(args.caseId, args.action, args.note, now, args.reviewerId);
    addEvent(db, args.orgId, args.caseId, "human.review_recorded", { action: args.action, notePresent: Boolean(args.note) });
    db.prepare("UPDATE cases SET updated_at = ? WHERE id = ? AND org_id = ?").run(now, args.caseId, args.orgId);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getCaseRecord(args.caseId, args.orgId);
}

export function listActivity(orgId: string, caseId?: string) {
  const db = database();
  const rows = caseId
    ? db.prepare("SELECT id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at FROM events WHERE org_id = ? AND case_id = ? ORDER BY occurred_at DESC LIMIT 200").all(orgId, caseId)
    : db.prepare("SELECT id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at FROM events WHERE org_id = ? ORDER BY occurred_at DESC LIMIT 200").all(orgId);
  return (rows as DbRow[]).map((row) => ({
    id: String(row.id), caseId: String(row.case_id), eventType: String(row.event_type),
    mode: String(row.mode), actorType: String(row.actor_type),
    payload: parse<Record<string, unknown>>(row.payload_redacted, {}), occurredAt: String(row.occurred_at)
  }));
}

export function getReceipt(orgId: string, caseId: string) {
  const record = getCaseRecord(caseId, orgId);
  if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
  if (!record.evidence) throw new HttpError(404, "RECEIPT_NOT_READY", "No evidence receipt is available for this case.");
  return {
    caseId: record.id, mode: record.mode, evidence: record.evidence, payment: record.payment,
    verdict: record.verdict, reason: record.decisionReason, limitations: record.evidence.limitations,
    serv: record.planMode === "serv" ? { requestId: record.servRequestId, model: record.model } : { state: "simulated" }
  };
}
