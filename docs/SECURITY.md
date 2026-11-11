# Security and release limits

## Current protections

- API reads and mutations require the local workspace session or bearer API key, except public liveness and capability status.
- The local workspace uses an HTTP-only signed cookie; API routes also authenticate independently. This is a single-password local access layer, not production identity or multi-tenant authentication.
- Case reads are scoped to the local organisation ID. Inputs are scenario-specific; arbitrary URLs, billing destinations, unknown fields and full bank details are rejected.
- Browser mutations verify request origin. API-key comparison is constant-time. Secrets are not returned by the API.
- SERV calls use the official inference host and reject redirects. The app validates refusal, truncation, JSON shape, allowed scenario capability and required fields.
- Sirenic uses a fixed HTTPS host and two exact company-profile URL patterns. Quote checks require Base USDC, a valid recipient, a maximum $0.05 amount and a fresh preflight before the paid call.
- EasyPost uses a fixed HTTPS endpoint, server-side Basic authentication, exact tracking-code and carrier matching, and a reduced response object.
- The Kite worker is loopback-bound by default, uses a bearer secret and constant-time comparison, limits execution to fixed Sirenic paths and GET requests, serializes active-session selection and execution, and caches the result by operation key.
- A provider operation is claimed before execution. Uncertain operations become blocked and are not retried automatically.
- Fixtures are synthetic and label payment as simulated. Unknown settlement is not rendered as paid.
- Review notes redact long digit runs. Response headers deny framing and disable camera, microphone and geolocation access.

## Important limitations

This is a hackathon build and has not had an independent security or privacy audit. It uses one local workspace password and API key, process-local rate limits, SQLite via Node.js `node:sqlite`, no tenant membership system, no durable distributed queue, no webhook delivery, and no formal retention/deletion control, monitoring or incident response.

The external adapters are not verified by a live provider transaction in this workspace. SERV credentials/model are blank. No EasyPost key or tracking request was used. No Passport account is signed into the CLI. The free Sirenic quote probe was unpaid; no paid response or signature was validated. Do not treat code presence or an HTTP 402 as proof of provider terms, accuracy, authorization, session binding or settlement.

Kite Passport documents allowance use when no usable session is selected. The worker therefore creates a fresh separate session and requires an explicit approved session ID for execution; it also checks that the ID belongs to the exact active request. The private `.env` keeps both live gates false until this behavior is verified against a signed-in account. `PASSPORT_SESSION_ONLY_VERIFIED` is an operator assertion, not proof by itself. The worker's fixed Sirenic URL allowlist remains enforced locally even though Passport does not enforce URL scope for paid calls.

Vercel deployment is fixture-only. The Vercel runtime's `/tmp` database is ephemeral and cannot reach the local worker. Do not add provider credentials or enable live variables in Vercel until a durable database, HTTPS-hosted worker and account-specific checks are in place.

## Secret handling

The real local `.env`, `.kpass` CLI installation, `.kite-passport` login state and worker idempotency cache are ignored by Git and stored under `S:\Hackathon\Veyra`. Do not upload them, record them, or include them in diagnostics. Use encrypted environment variables or a managed secret store for deployed services. Rotate the local login password, API key, signing secret and worker token if the `.env` is exposed.

## Release requirements

Before public-user production use, replace local sign-in, move case/session state to durable tenant-scoped storage, define retention and deletion, validate source terms and current pricing, verify the actual provider response and signed evidence where supported, prove Passport session-only execution with allowance disabled, and complete independent security and privacy review. Keep live actions disabled until the Passport and quote-integrity checks pass.
