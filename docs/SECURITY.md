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
- Public visitor payments use the visitor's injected wallet directly with x402 exact scheme. The client pins the quote's Base USDC contract, recipient, amount, domain and expiry; its spend control caps a call at 5,000 USDC base units. Vercel never receives the wallet key. The result is shown only after verifying Sirenic's detached Ed25519 signature against its published key document.
- The public visitor route is production-only and currently accepts French SIREN profiles. Vercel Preview disables it, even though the payment is visitor-funded.
- Review notes redact long digit runs. Response headers deny framing and disable camera, microphone and geolocation access.

## Important limitations

This is a hackathon build and has not had an independent security or privacy audit. It uses one workspace password and API key, process-local rate limits, SQLite locally, and Supabase Postgres with server-role-only access when deployed credentials are configured. It has no tenant membership system, durable distributed queue, webhook delivery, formal retention/deletion control, monitoring or incident response.

An authenticated SERV structured-output request and an EasyPost test-mode tracker succeeded locally. One local and one hosted $0.005 Sirenic request completed through explicitly approved Passport sessions; the worker rejected a mismatched session ID before sending a provider request. Kite activity associated both completed payments with their sessions, and Base receipts confirmed settlement. No EasyPost production tracker was run. These two checks do not establish provider terms, general production accuracy, or behavior outside the tested requests. Do not treat code presence, test-mode evidence, or an HTTP 402 as proof of authorization or settlement.

Kite Passport documents allowance use when no usable session is selected. The worker creates a fresh separate session and requires an explicit approved session ID for execution; it also checks that the ID belongs to the exact active request. A live mismatched-ID rejection and successful approved-session payments were verified locally and through the hosted path. The local `.env` and Vercel Production Passport gates are enabled after these checks. `PASSPORT_SESSION_ONLY_VERIFIED` remains an operator assertion, not proof by itself; the hosted test supplies evidence for this exact implementation. The worker's fixed Sirenic URL allowlist remains enforced on both paths even though Passport does not enforce URL scope for paid calls.

Vercel production uses the dedicated Supabase project, and the authenticated case API passed create, idempotent replay, fetch, list and one live end-to-end case. The public demo now includes a direct visitor-wallet Sirenic route and labels the remaining examples synthetic. The visitor-funded browser flow has not yet completed its first paid end-to-end check. Provider credentials are stored as encrypted, server-only Vercel variables. Hosted Passport execution uses a named persistent Sandbox, and the Kite CLI login plus registered Veyra buyer identity are stored in its private snapshots; Sandbox sessions auto-terminate after five minutes. Limit Sandbox team access and retain only the latest snapshot. Production operator payments are enabled for this single-workspace deployment after the tested hosted flow; every paid operator operation still requires a new passkey approval. Preview has no Passport payment flags or hosted worker name, and the visitor-wallet flow is explicitly disabled there.

## Secret handling

The real local `.env`, `.kpass` CLI installation, `.kite-passport` login state and worker idempotency cache are ignored by Git and stored under `S:\Hackathon\Veyra`. The hosted `.kite-passport` state is stored in protected Vercel Sandbox snapshots; do not export or log it. Use encrypted environment variables or a managed secret store for deployed services. Rotate the local login password, API key, signing secret and worker token if the `.env` is exposed.

## Release requirements

The visitor-wallet route does not share a payer: each visitor signs and pays from their own wallet, so the operator does not need to approve visitors or fund their calls. Before broader provider coverage, add each country and route only after checking its quote, price, data fields and terms. Complete one visitor-funded Production lookup to confirm wallet signing, x402 settlement and browser signature verification. Define clear data retention and privacy notices and complete an independent security review before presenting Veyra as a general production service. The authenticated operator Passport path remains single-owner and still requires a fresh approval for each paid operation. Kite's shared allowance stays disabled because it could charge the operator for other users' calls.
