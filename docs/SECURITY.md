# Security and release limits

## Current protections

- API reads and mutations require the local workspace session or bearer API key, except public liveness and capability status.
- The local workspace uses an HTTP-only signed cookie; API routes also authenticate independently. This is a single-password local access layer, not production identity or multi-tenant authentication.
- Case reads are scoped to the local organisation ID. Inputs are scenario-specific; arbitrary URLs, billing destinations, unknown fields and full bank details are rejected.
- Browser mutations verify request origin. API-key comparison is constant-time. Secrets are not returned by the API.
- SERV calls use the official inference host and reject redirects. The app validates refusal, truncation, JSON shape, allowed scenario capability and required fields.
- Sirenic uses a fixed HTTPS host and two exact company-profile URL patterns. Quote checks require Base USDC, a valid recipient, a maximum $0.05 amount and a fresh preflight before the paid call.
- EasyPost uses a fixed HTTPS endpoint, server-side Basic authentication, exact tracking-code and carrier matching, and a reduced response object.
- The local Kite worker is loopback-bound by default. Vercel runs the same worker code in a named Sandbox with no public ports and generates an in-memory bearer token for each internal invocation. The worker uses constant-time comparison, limits execution to fixed Sirenic paths and GET requests, serializes active-session selection and execution, and caches results by operation key.
- A provider operation is claimed before execution. Uncertain operations become blocked and are not retried automatically.
- Fixtures are synthetic and label payment as simulated. Unknown settlement is not rendered as paid.
- Review notes redact long digit runs. Response headers deny framing and disable camera, microphone and geolocation access.

## Important limitations

This is a hackathon build and has not had an independent security or privacy audit. It uses one workspace password and API key, process-local rate limits, SQLite locally, and Supabase Postgres with server-role-only access when deployed credentials are configured. It has no tenant membership system, durable distributed queue, webhook delivery, formal retention/deletion control, monitoring or incident response.

An authenticated SERV structured-output request and an EasyPost test-mode tracker succeeded locally. One $0.005 Sirenic request completed through an explicitly approved Passport session; the worker rejected a mismatched session ID before sending a provider request. Kite activity associated the completed payment with that session, and a Base receipt confirmed settlement. No EasyPost production tracker was run. This single check does not establish provider terms, general production accuracy, or behavior outside the tested request. Do not treat code presence, test-mode evidence, or an HTTP 402 as proof of authorization or settlement.

Kite Passport documents allowance use when no usable session is selected. The worker creates a fresh separate session and requires an explicit approved session ID for execution; it also checks that the ID belongs to the exact active request. A live mismatched-ID rejection and a successful approved-session payment were verified locally. The private local `.env` enables the local Passport gates based on those checks. Hosted gates remain closed until the remote CLI login and full app flow pass. `PASSPORT_SESSION_ONLY_VERIFIED` is an operator assertion, not proof by itself. The worker's fixed Sirenic URL allowlist remains enforced on both paths even though Passport does not enforce URL scope for paid calls.

Vercel production uses the dedicated Supabase project, and the authenticated fixture-mode case API passed create, idempotent replay, fetch, and list after deployment. The public demo remains synthetic. Provider credentials are stored as encrypted, server-only Vercel variables. Hosted Passport execution uses a named persistent Sandbox, and the Kite CLI login is stored in its private snapshots; Sandbox sessions auto-terminate after five minutes. Limit Sandbox team access and retain only the latest snapshot. Keep paid Passport flows disabled until the separate hosted login and end-to-end flow are verified.

## Secret handling

The real local `.env`, `.kpass` CLI installation, `.kite-passport` login state and worker idempotency cache are ignored by Git and stored under `S:\Hackathon\Veyra`. The hosted `.kite-passport` state is stored in protected Vercel Sandbox snapshots; do not export or log it. Use encrypted environment variables or a managed secret store for deployed services. Rotate the local login password, API key, signing secret and worker token if the `.env` is exposed.

## Release requirements

Before public-user production use, replace local sign-in with tenant-scoped authentication, make session and operation state durable and tenant-scoped, define retention and deletion, validate source terms and current pricing, verify the actual provider response and signed evidence where supported, prove Passport session-only execution with allowance disabled, and complete independent security and privacy review. Keep live actions disabled until the Passport and quote-integrity checks pass.
