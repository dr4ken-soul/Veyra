PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK(scenario IN ('supplier','shipment','registration')),
  mode TEXT NOT NULL CHECK(mode = 'fixture'),
  state TEXT NOT NULL,
  question TEXT NOT NULL,
  input_json TEXT NOT NULL,
  external_ref TEXT,
  idempotency_key TEXT,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(org_id, idempotency_key),
  UNIQUE(org_id, external_ref)
);
CREATE INDEX IF NOT EXISTS cases_org_created ON cases(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS plans (
  case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  reasoning_mode TEXT NOT NULL CHECK(reasoning_mode IN ('serv','simulated')),
  request_id TEXT,
  model TEXT,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  upstream_name TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  source_timestamp TEXT,
  matched_subject TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  digest_sha256 TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode = 'fixture'),
  payment_state TEXT NOT NULL CHECK(payment_state = 'simulated'),
  evidence_state TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  payment_state TEXT NOT NULL CHECK(payment_state = 'simulated'),
  amount_minor TEXT,
  asset TEXT,
  network TEXT,
  transaction_ref TEXT,
  confirmation_ref TEXT,
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  note TEXT,
  reviewed_at TEXT NOT NULL,
  reviewer_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  payload_redacted TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_org_case_time ON events(org_id, case_id, occurred_at DESC);