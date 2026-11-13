# Veyra | App Blueprint

Status: product and safety blueprint. Implementation and verification status are tracked in README.md and docs/INTEGRATION_STATUS.md; this local build is not security-audited.
Last researched: 10 November 2026
Target: SERV Hackathon Edition 02, Kite track

## 1. Product summary

Veyra is an API-first evidence procurement agent. An existing workflow sends a decision question and context. SERV Reasoning identifies a gap and proposes an evidence query. Veyra applies deterministic policy and, when an eligible spending session has been explicitly approved, requests a paid x402 call through Kite Passport. It returns the evidence, its provenance, a bounded interpretation, and a payment receipt where confirmed.

Veyra is not an invoice-payment product. Buying evidence and releasing an invoice are separate actions. It does not prove bank-account ownership from a company-registry record. Where the evidence cannot answer the decision question, the result is `needs_review` or `insufficient_evidence`, not a reassuring guess.

**One-line pitch:** Buy the proof before you decide.

**Primary customers:** accounts-payable teams, ecommerce operations teams, and the developers building their workflows. Buyers integrate through an API or use the demo web app. The first judged flow is a changed supplier-bank-detail investigation.

## 2. Research, partner fit and constraints

- [Official hackathon](https://www.openserv.ai/hackathon-2): every track uses SERV Reasoning. Public repository, demo link or video, short write-up and X post link required. Submit by 15 November 2026, 23:59 UTC, which is 16 November at 00:59 in Lagos. Creativity, user readiness and revenue potential are named judging dimensions. Award breakdown remains TBA.
- [SERV quickstart](https://docs.openserv.ai/serv-reasoning/introduction.md): OpenAI-compatible base URL `https://inference-api.openserv.ai/v1`; `SERV_API_KEY` and a system or developer instruction are required. Model IDs and credit balance must be checked at build time.
- [SERV structured outputs](https://docs.openserv.ai/serv-reasoning/tutorials/structured-outputs.md): schema is forwarded to compatible models, but the application must validate and handle truncation, refusal and invalid responses. Schema conformance is not a safety guarantee.
- [Kite Passport payments](https://docs.gokite.ai/passport/payments): `kpass` requests a session, returns a passkey approval URL, then executes an eligible paid call. Session scope includes per-payment, total and expiry limits. A wallet is funded with USDC.e on Kite for the documented live flow.
- [Kite allowance rules](https://docs.gokite.ai/passport/payments/allowance): an expired or absent session may allow a shared allowance to pay without another prompt. Veyra is session-only: it must prove a session-specific execution path is in force and must never silently fall back to allowance. If the installed integration cannot enforce and verify this, disable live execution and escalate.
- [Kite catalog](https://agentpassport.ai/explore): as researched on 10 November, it lists Sirenic, offering French and wider European company records, with a stated range of $0.002 to $0.03 per call. Listing is not proof of a suitable endpoint, uptime, country coverage, accuracy, licence, Passport compatibility for a given session, or successful payment. Inspect and test the exact endpoint before claiming support.
- [Priority Hono x402 repository](https://github.com/BrKDDD/kite-x402-hono): community Bun/Hono reverse proxy using `@x402/hono`, not an official guarantee of any merchant. Its documentation distinguishes mainnet USDC.e from testnet pieUSD. The example is local and not evidence of a deployed receipt. Never assume the CLI, token and facilitator combinations are compatible until verified.
- [Companies House public API](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/guides/gettingStarted): candidate source for UK company registration. A company record does not verify payment details or prove an organisation is trustworthy. Verify API terms, credentials and redistribution rights before wrapping it.
- [EasyPost API](https://www.easypost.com/docs/api): possible shipment evidence source. Credentials, carrier support, permissions, billing and redistribution must be verified. Delivery status is not proof of item quantity or condition.

### Explicit adapter boundary

Kite Passport does not automatically turn an arbitrary merchant, invoice application or evidence source into an x402 service. Veyra supports a source only after an adapter exists, its capability and endpoint are tested, the provider is permitted, and the payment path is confirmed. Modes:

1. **Catalog service:** discover an eligible endpoint, inspect the current quote and network, validate source terms and run a live proof before calling it supported.
2. **Veyra-operated x402 adapter:** an explicitly disclosed seller wraps an authorised upstream. Check licence, API key and redistribution terms. The wrapper is a separately operated service, not independent corroboration merely because it is paid.
3. **Synthetic fixture:** deterministic evidence and payment events for tests. Labels must say `Simulated`. Never claim a real transaction or official record.

Do not claim supported providers, endpoints or paid receipts before verifying them. The availability and exact meaning of partner fields are integration questions, not guarantees.

## 3. Three scenario packs

All use the same core case, policy, evidence and receipt contracts. They are configurable scenario packs, not three independent applications.

| Pack | User question | Candidate evidence | Decision boundary | Demo status |
|---|---|---|---|---|
| Supplier change | A supplier requests changed bank details. What can we establish before the invoice is considered? | Entity registration and a permitted account-ownership service if one is actually available. Prior trusted vendor record is supplied by the user. | Registration is not bank ownership. Without an authorised account-ownership source and human verification, `needs_review`. Veyra never releases the invoice. | Primary end-to-end journey; bank ownership source unconfirmed. |
| Shipment | Does the carrier record support the claimed delivery status? | User-authorised tracking record and timestamps through a verified carrier provider or adapter. | Carrier status does not prove package contents or condition. Missing, stale or conflicting events require review. | Same core pipeline, adapter and credentials to be verified. |
| Business registration | Is a counterparty currently recorded as active in a specified registry? | Sirenic catalog endpoint or Companies House through a permitted adapter, depending on jurisdiction and availability. | Preserve precise source status and retrieval time. Registry status is not identity verification, sanctions clearance or a guarantee of solvency. | Same core pipeline; exact endpoint to be verified. |

A scenario pack defines required input fields, the narrow question, approved evidence types, freshness threshold, safe interpretation rules, and human escalation conditions. No arbitrary input field can request arbitrary URLs.

## 4. User journey and product mechanics

1. User signs into Veyra or sends a case through an authenticated API. Choose a scenario and submit the minimum information needed.
2. SERV extracts the missing question and proposes a structured query with reason, expected evidence and alternatives. A local schema validator checks the response.
3. Deterministic policy selects only an approved provider and permitted operation. Validate jurisdiction, provider ownership, source, freshness, quote, amount, currency, session ID and origin. Invalid or unavailable fields result in review, never an optimistic guess.
4. If a paid query is justified, Veyra requests a Passport session. User opens the genuine approval URL on a passkey-enabled device, reviews task, per-transaction and total cap, asset and expiry, then approves. Display the external domain, not a copied passkey prompt.
5. Veyra checks the session is active and specifically bound to this user, agent, environment and task. Execute at most one authorised attempt per unique operation. Passport and application controls both apply.
6. Record the response and settlement independently. A paid response, payment status and evidence quality are separate facts. Validate evidence schema, source identity, time, jurisdiction and matched entity. SERV creates a bounded interpretation, citing evidence IDs, followed by deterministic decision rules.
7. Return `supported`, `needs_review`, `insufficient_evidence`, or `blocked` with a receipt and clear limitations. No claim of approval, fraud detection, legal clearance or invoice settlement.

### Why buy a check?

The policy records why a query may answer the missing question and whether the available budget permits it. The initial decision uses a user-defined maximum willingness to spend and predefined scenario requirements, not a fabricated monetary expected-value estimate. If required evidence is already present and fresh, reuse it only where source rights and the user's policy permit. If no admissible source exists, escalate without spending.

## 5. MVP feature set and acceptance criteria

### A. Evidence case API and three scenario packs
**Story:** As an operator, I want to ask one narrow question in my existing workflow so that the returned evidence is usable there.

- POST a valid scenario and receive a stable case ID and status. API key is scoped to an organisation.
- The system rejects unknown scenarios and accepts only scenario-specific fields. No API lets a caller supply an arbitrary URL or billing destination.
- Supplier bank change, shipment and registration each return source-specific limitations. Run the full paid flow for at least one scenario before claiming live support. Other packs are labelled planned, test or live as appropriate.
- Complexity: high.

### B. SERV evidence plan and bounded interpretation
**Story:** As a user, I want the agent to identify what evidence is missing, so it does not buy irrelevant checks.

- A real SERV request produces a schema-validated plan containing the question, approved capability, rationale and expected output. Logs record request ID and configured model, not hidden chain-of-thought.
- Malformed, truncated or refused output blocks execution. Retrieved content is untrusted data, never instructions.
- The final recommendation references evidence IDs. Unsupported claims or missing evidence result in review.
- Complexity: high.

### C. Session-only paid evidence query
**Story:** As a user, I want to approve a maximum spend and expiry so the agent cannot exceed my authorised scope.

- A genuine Passport approval is necessary for live calls. The user sees amount, asset, provider, task, expiry and external approval URL.
- Veyra's policy rejects unapproved provider, unexpected origin, asset, recipient or amount, stale quotes, inactive session and total overrun. Server-side enforcement does not rely on an LLM.
- The application's separate limit ledger is advisory defence in depth; Passport is the ultimate spending authority. Never claim that Veyra's own database can change a Passport cap.
- If live session binding, quote-to-execution integrity or no-fallback behaviour is not provable, fail closed and mark the live adapter blocked.
- Complexity: high.

### D. Evidence and payment receipt
**Story:** As a reviewer, I want to see what was bought and what it proves so I can decide whether to act.

- Receipt shows evidence source and operator separately, source timestamp where available, retrieval timestamp, status, matched inputs, limitations, price/asset/network, verified transaction reference if available, and an explicit mode label.
- `payment_unknown` is never displayed as paid. Network confirmations and tool activity are checked before recording `confirmed`; no invented transaction hash or explorer URL.
- A client can fetch a redacted case result. A case can be exported as JSON without leaking secrets or signed payment headers.
- Complexity: medium.

### E. Human review and embedded integration
**Story:** As an integration developer, I want my existing system to receive a recommendation while retaining the decision to act.

- Results include a clear reason and evidence references. The demo has a human review action; no ERP, invoice settlement or arbitrary merchant connector is presented as built.
- Callback delivery is signed, retried with a stable event ID and replay-protected. A failed callback never repeats a paid call.
- Complexity: medium.

**Out of scope:** invoice or bank transfers, unsupervised high-stakes decisions, universal merchant compatibility, claims of complete fraud prevention, native token, custom contracts, real customer data in a public demo, and unverified provider or testnet capabilities. Production release needs security review, privacy review, source licensing and appropriate compliance/legal review.

## 6. Market and monetisation

**Payers:** AP automation vendors; multi-carrier ecommerce platforms; workflow and agent platform developers. Today they may contract separately for data, shipping APIs and review workflows. Veyra's proposed differentiation is a source-and-spend-aware evidence receipt inside the existing workflow, not the underlying public information alone.

Alternatives, not direct equivalents: [OpenCorporates](https://opencorporates.com/api/), [Companies House](https://developer.company-information.service.gov.uk/), [EasyPost](https://www.easypost.com/pricing), [AfterShip](https://www.aftership.com/pricing), and [Dun & Bradstreet](https://www.dnb.com/). Validate actual vendor features, current pricing, integration terms and reviews before claiming comparative superiority. Public company data can be free; an adapter must disclose that it charges for access, normalisation or convenience, not suggest the public record itself is proprietary.

**Proposed business model, not validated pricing:** Developer: $0/month plus underlying provider spend; Team: $49/month plus provider spend, up to a defined fair-use cap to be set after cost measurement; Enterprise: negotiated. Use Stripe for Veyra's subscription if implemented, while Passport handles authorised evidence purchases. No fee or fee capture is promised in the hackathon demo.

Illustrative monthly Team revenue only: 10 customers $490; 50 $2,450; 200 $9,800; 1,000 $49,000. Excludes churn, free customers, taxes, infrastructure, provider costs and processing fees. Not a forecast. TAM/SAM/SOM and conversion rate are unvalidated and should be researched, not invented.

## 7. Recommended technical architecture

Builder/team size, experience, availability and budget were not provided. These are recommendations, not confirmed constraints.

| Layer | Proposed choice | Reason and caveat |
|---|---|---|
| Web | Next.js App Router, TypeScript, Tailwind, accessible component primitives | One typed web surface and API integration; pin current supported versions at build time. |
| Backend | Node.js TypeScript service, REST API and worker | Shared validation with web; run payment execution in an isolated worker, not browser code. |
| Reasoning | SERV OpenAI-compatible chat API | Required by event. Model configured server-side; validate schema and availability. |
| Evidence | Catalog adapters plus separately deployed Hono x402 adapter where allowed | Plug-in contract; only verified adapters marked live. |
| Payments | Kite Passport CLI or officially supported interface | Exact per-session binding, quote inspection and supported execution capability must be verified on installed version. |
| Database | Postgres | Transactional operation locks, event history and tenant isolation. |
| Auth | Supabase Auth or equivalent server-verifiable auth | Organisation and user sessions are separate from Passport approval. Confirm deployment choice before build. |
| Queue | Postgres-backed job queue | Recoverable work, clear idempotency and bounded retries. |
| Hosting | HTTPS web host plus worker host supporting controlled CLI execution | Vercel is a candidate for web; a separate worker host is needed if CLI runtime is incompatible. No localhost URLs in browser. |
| Observability | Structured logs and Sentry, redacted | IDs and states only. Never log keys, approval codes, signed payment headers, raw bank data or provider credentials. |

Do not add smart contracts merely because Kite is used. Do not use a generic wallet-connect check as proof of Passport authorisation. A wallet connection is not authentication; the app must verify a real user session and the session-specific Passport linkage.

### Deployment modes

- `fixture`: synthetic source and simulated payment, never real funds. Clearly labelled on every case and receipt.
- `test`: non-production endpoint, facilitator, token and wallet, only after their compatibility is verified; use actual test transaction IDs where confirmed.
- `live`: supported Passport user session and funded wallet with per-task authorisation. Real data only with user permission and vendor terms. Default to blocked until preflight and controls are proven.

Never silently fall back between modes. User must knowingly select the environment; API responses and UI badges include mode.

## 8. Data model

All records include `id UUID`, `org_id UUID`, `created_at timestamptz`, and `updated_at timestamptz` unless otherwise stated. Organisation and user IDs reference the auth provider. JSON fields are versioned and validated; sensitive values are encrypted where needed and minimised by default.

| Table | Additional fields | Constraints and relationships |
|---|---|---|
| `organisations` | `name text`, `status text` | ID is tenant root; no org_id field. |
| `memberships` | `user_id UUID`, `role enum(owner,operator,viewer)` | Unique `(org_id,user_id)`; role checked server-side. |
| `api_credentials` | `prefix text`, `secret_hash text`, `scopes text[]`, `expires_at timestamptz`, `revoked_at timestamptz` | Store a one-way hash, never the API secret. |
| `cases` | `scenario enum(supplier,shipment,registration)`, `mode enum(fixture,test,live)`, `state enum`, `question text`, `input_redacted jsonb`, `external_ref text`, `creator_id UUID` | Index `(org_id,created_at DESC)`, unique `(org_id,external_ref)` when present. Never store bank account numbers in the redacted input. |
| `evidence_plans` | `case_id UUID`, `schema_version text`, `serv_request_id text`, `model text`, `plan jsonb`, `validation_status text` | FK cases; index `(org_id,case_id)`. |
| `providers` | `operator_name text`, `upstream_name text`, `capability text`, `environment text`, `allowed_origin text`, `licence_status text`, `verified_at timestamptz` | Each provider is tenant-approved. No arbitrary URL from model output. |
| `spending_sessions` | `case_id UUID`, `external_session_ref text`, `state enum`, `asset text`, `network text`, `per_tx_minor numeric(78,0)`, `total_minor numeric(78,0)`, `expires_at timestamptz`, `approval_url_host text`, `verified_at timestamptz` | Store reference and metadata only, never passkeys, secrets or approval codes. Numeric minor units are integer token units; check token-specific decimals. |
| `operations` | `case_id UUID`, `provider_id UUID`, `session_id UUID`, `request_hash text`, `idempotency_key UUID`, `state enum`, `quote jsonb`, `locked_at timestamptz`, `lease_owner text`, `attempt_count int` | Unique `(org_id,idempotency_key)`; unique active operation for the same case/capability. A database transaction reserves spend before dispatch. |
| `evidence` | `case_id UUID`, `operation_id UUID`, `source_name text`, `operator_name text`, `retrieved_at timestamptz`, `source_timestamp timestamptz NULL`, `payload_redacted jsonb`, `digest_sha256 text`, `freshness text`, `limitations text[]` | FK operation; digest shows stored bytes were unchanged, not that the source was correct. |
| `payment_receipts` | `operation_id UUID`, `state enum`, `amount_minor numeric(78,0)`, `asset text`, `network text`, `transaction_ref text NULL`, `confirmation_ref text NULL`, `confirmed_at timestamptz NULL` | Unique operation; may remain unknown. Never infer confirmation from a submitted command. |
| `decisions` | `case_id UUID`, `verdict enum`, `reason text`, `evidence_ids UUID[]`, `review_required boolean`, `reviewed_by UUID NULL`, `reviewed_at timestamptz NULL` | Every cited evidence ID must belong to the same tenant and case. |
| `events` | `case_id UUID`, `event_type text`, `mode text`, `actor_type text`, `payload_redacted jsonb`, `occurred_at timestamptz` | Append-only; index `(org_id,case_id,occurred_at)`. No sensitive payloads. |
| `webhook_endpoints` | `url text`, `secret_ref text`, `events text[]`, `status text` | HTTPS, allowlisting and SSRF controls. Secret resides in a secret manager. |
| `webhook_deliveries` | `endpoint_id UUID`, `event_id UUID`, `attempt_count int`, `state text`, `next_attempt_at timestamptz` | Unique `(endpoint_id,event_id)`, independently retried. |

Apply tenant isolation on every query, RLS if using Supabase, role-scoped API access and service-role restrictions. Parent ownership must be verified even when a UUID is valid. Keep a migration per logical change under `db/migrations/`; SQL implementation waits for code approval.

## 9. API contract

All `/v1` routes require bearer user session or scoped API credential unless noted. Return JSON with `requestId`; errors include `code`, `message`, `retryable`. Support pagination via opaque cursor. Suggested per-organisation limits are provisional and must be load-tested.

| Method and path | Request | Response and behaviour | Limit |
|---|---|---|---|
| POST `/v1/cases` | `scenario`, `mode`, `input`, optional `externalRef`, `idempotencyKey` | `201 {caseId,state,mode}`; validate input; duplicate key with different body gives `409`. | 30/min |
| GET `/v1/cases` | cursor, scenario, state | `{items,nextCursor}` filtered by tenant. | 120/min |
| GET `/v1/cases/{id}` | none | Case, status and redacted event summary; `404` for inaccessible case. | 120/min |
| POST `/v1/cases/{id}/plan` | `policyId` | `202 {planId,state}`; SERV work async, no spend. | 20/min |
| GET `/v1/cases/{id}/plan` | none | Validated plan and provider candidates, or visible failure state. | 120/min |
| POST `/v1/cases/{id}/sessions` | `asset`, `network`, `perTxMinor`, `totalMinor`, `expiresAt` | `202 {sessionId,state,approvalUrl}`; genuine Passport response only; URL host allowlisted. | 10/min |
| GET `/v1/sessions/{id}` | none | Session state and verified limits; no credentials. | 120/min |
| POST `/v1/cases/{id}/execute` | `planId`, `sessionId`, `idempotencyKey` | `202 {operationId,state}` after deterministic preflight. `409` on conflict, unknown state or already-in-flight. | 10/min |
| GET `/v1/operations/{id}` | none | `{state,paymentState,evidenceState}`; no silent retries after uncertain payment. | 120/min |
| GET `/v1/cases/{id}/receipt` | none | Redacted evidence, operator, limitations, payment details and mode. | 120/min |
| POST `/v1/cases/{id}/review` | `action` and optional note | Records human review, never initiates invoice payment. | 20/min |
| POST `/v1/webhook-endpoints` | HTTPS URL, subscribed events | Create endpoint after verification and SSRF checks; webhook signing secret shown once or provisioned via secure configuration. | 5/min |
| GET `/healthz` | none | Public liveness only, no secrets, no provider reachability claims. | 60/min/IP |

For callbacks send an HMAC-SHA256 signature over version, timestamp and exact body. Consumer must verify signature, timestamp and stable event ID. Retries reuse event ID and do not restart a payment. Only expose system webhook endpoints if the external provider documents a signature mechanism; otherwise poll confirmed status using an authenticated worker.

## 10. State machine and money safety

`draft -> planning -> awaiting_session -> ready -> executing -> evidence_received -> decided`.
Alternative terminal/holding states: `needs_review`, `blocked`, `failed`, `payment_unknown` and `cancelled`. `awaiting_session` is not permission to execute. No transition occurs from `payment_unknown` back to executing automatically.

Payment and evidence have separate state: `payment: not_started | pending | confirmed | failed | unknown`; `evidence: unavailable | received | invalid | stale`. `confirmed` requires a provider-confirmed transaction record and, when available, chain confirmation. A successful API response is not itself proof of settlement.

**Concurrency and ambiguity:** Acquire a durable DB lock and reserve the full quoted amount against the per-case ledger before dispatch. Check per-tx and total caps using integer minor units, no floating-point arithmetic. Use a supported provider idempotency key if documented and verified. The application's local key prevents its own duplicate scheduling but cannot guarantee provider-level exactly-once settlement. If a timeout occurs after dispatch, mark `payment_unknown`, reconcile through Passport activity and, where available, chain records, then release or settle the reservation only on evidence. If unresolved, require human intervention. Do not invoke a second payment as a retry.

**Quote and destination security:** Discovery data, evidence content and LLM output are untrusted. Resolve only configured, HTTPS, public, allowed origins, reject private/link-local addresses and rebinding, enforce same-origin redirects, and verify asset, network, receiver, price, path and method against policy. Verify whether the real Passport interface exposes and binds the challenge to execution. If it does not, do not claim quote integrity or enable live payment. Run an isolated worker with scoped Passport access and no general shell access from user content. No arbitrary URL or tool execution.

**Approval and retention:** Display user, agent, task, session limits, expiry and provider. Default deny. Do not persist signed payment payloads, API keys, passkeys, approval codes, bank account numbers or secrets in client storage or public logs. Define retention, consent and deletion before real-user launch. Never send confidential customer information to a public evaluation service. Protect third-party source data as required by licence.

## 11. Frontend and demo

Frontend decisions and full screen-level states are in `FRONTEND_SPEC.md`. Core screens: cases, case detail, spending session, activity and settings. The public demo has a visitor-funded French Sirenic profile lookup; the quote must be reviewed before signing, the payment cap must remain $0.005, and the response must pass Sirenic Ed25519 signature verification before display. That route pays from the visitor's own Base wallet and does not use the Veyra operator's Passport or SERV balance. Other demo scenarios stay clearly marked as fixtures. The private operator flow shows a real SERV request ID and Passport receipt only when independently confirmed. No fake live counters or implied sponsorship logos.

Suggested demonstration:
1. Show a supplier bank-detail change with a missing account-ownership proof.
2. SERV proposes a company-record lookup, clearly stating what that can and cannot establish.
3. User approves a bounded Passport session. If live preflight passes, buy one authorised evidence query; otherwise use a clearly labelled fixture/test path.
4. Show verified or simulated receipt according to actual mode. Decision remains `needs_review` because a company record is not bank ownership proof.
5. Show same integration contract selecting a shipment or registration scenario. Do not claim a provider is live if it has not been tested.

## 12. Tests and release checklist

- Unit: scenario schemas; evidence freshness; tenant permissions; source-versus-operator labels; integer arithmetic; deterministic verdicts; injection resistance; invalid SERV JSON and refusal.
- Payment: approved session, expired session, missing session, allowance fallback attempt, cap violation, concurrent execution, altered quote, unexpected recipient/asset/host, timeout after dispatch, unknown settlement, replay and callback duplication. All fail closed as appropriate.
- Integration: real SERV request ID and evidence source trace; Passport session approval and activity; verified on-chain receipt if supported. Check testnet and live separately. Do not treat a local 402 or an echo service as a settled payment.
- Security: access control across organisations, safe URLs, no secrets in client or logs, redirect protections, signed webhooks and deletion/export requests.
- UX: keyboard, reduced motion, mobile layout, protected deep links, loading, failure and review. Test actual Passport approval in its real browser context, not a copied UI.
- Event: public repository, README, deployed HTTPS demo or video, write-up specifying SERV and Kite, and X post by the deadline with post link in the submission form. Confirm real vs test vs simulated for every feature. [Submission form](https://openserv.typeform.com/submissions02)

## 13. Cost and roadmap

Budget is not yet provided. Start with event credits where eligible and only spend funds explicitly approved by the user. Pricing changes; before implementation obtain current quotes for hosting, Postgres, SERV model, source APIs, facilitator and gas. No reliable 0/100/1,000/10,000-user cost totals can be stated without usage, source and retention assumptions. Use `monthly cost = fixed hosting + cases × (SERV cost + evidence cost + queue/storage cost) + payment/network costs`; obtain measured values before publishing estimates.

**Four flexible milestones, not a restriction on ambition:**
1. Confirm supplier workflow and provider feasibility; validate SERV schema and session-only Passport behaviour.
2. Build core case lifecycle, first verified evidence adapter, safety gate and receipt.
3. Add shipment and registration packs, test mode, callbacks and responsive UX.
4. Run adversarial payment tests, document real evidence, deploy and record an honest demo.

Sequence may change after team, budget and external access are known. See `BUILD_GUIDE.md` for implementation checkpoints and `MARKETING.md` for submission assets.
