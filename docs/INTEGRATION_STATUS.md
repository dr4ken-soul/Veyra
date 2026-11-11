# Integration status

Last updated: 11 November 2026.

| Capability | Implemented | Verified in this workspace | Current gate |
|---|---|---|---|
| SERV Reasoning | OpenAI-compatible JSON-schema request and local validation for plans | Official endpoint and request shape checked against current docs; no key/model configured and no authenticated request sent | Add an eligible key and model, then capture a real request ID |
| Sirenic company evidence | Fixed GB/FR company profile URLs, unpaid quote preflight, quote policy, subject matching and constrained Passport execution | A free no-payment GET to the public French profile returned HTTP 402; its Base USDC quote format was inspected. No paid call, response or provider signature was verified | Configure Passport and prove x402 compatibility and session-only behavior |
| EasyPost shipment evidence | Test/production tracker adapter with fixed endpoint, key server-side, response matching and no automatic retry after uncertainty | No API key or tracker request supplied | Add the correct test or production key; verify a test tracker first |
| Kite Passport worker | Separate authenticated Node worker, Kite CLI 6.13.2 session/delegation commands, separate-session request, approval link validation, active-session check, fixed Sirenic allowlist, explicit `--session-id`, and idempotency cache | CLI help and installed Passport skill bundle were inspected. No Passport login/session/paid request attempted | Sign in on the worker, fund only a chosen amount, approve the session, then verify the explicit-session flow and rejection of a wrong or expired session before setting `PASSPORT_SESSION_ONLY_VERIFIED=true` |
| Payments | Receipt states distinguish simulated, test/no payment, account billing, pending, confirmed and unknown | No transaction or EasyPost production billing occurred | Only Passport worker-reported status is saved; independently inspect Passport activity before claiming settlement |
| Fixtures | Synthetic supplier, shipment and registration evidence | Fixture demo builds locally; no live source is represented by fixtures | Always label as Simulated |
| Vercel | Git-connected fixture demo deployment | Existing connected Vercel account and team were identified; project deployment proceeds after Git push | Vercel uses fixture mode; SQLite `/tmp` and a localhost worker are not production persistence/compute |
| Webhooks | Not implemented | No callback or retry endpoint exists | Not available |

## SERV setup

The adapter uses `https://inference-api.openserv.ai/v1`, an eligible `SERV_REASONING_API_KEY`, and `SERV_MODEL`. It sends the case fields to SERV only when the user requests an evidence plan. The local validator rejects refusal, truncation, invalid JSON, wrong capability and incomplete fields. Select a model from the [official model catalog](https://docs.openserv.ai/serv-reasoning/models) that is enabled for your account; no model should be guessed. No SERV request ID exists in this workspace yet.

## Sirenic setup and payment boundary

The adapter constructs only `GET /v1/eu/entreprise/GB/{company_number}` or `GET /v1/entreprise/{siren}` for France. It reads `PAYMENT-REQUIRED`, accepts only Base USDC within Veyra's $0.05 ceiling, and stores the quoted amount, asset, network and recipient in the session metadata. The worker only allows these Sirenic paths and GET requests. A fresh quote is compared before execution, and one operation is reserved before sending the paid request.

The quote preflight was unpaid. This does not verify the result fields, registry freshness for a given number, source licence for a given use, Kite merchant compatibility, settlement, or the session's binding to the approved quote.

## Passport gate

Kite documents that an allowance can pay when no usable session is selected. Veyra avoids that implicit path in code: it creates a fresh separate session using `kpass session create --separate --no-reuse` and passes its approved ID explicitly to `kpass session execute --session-id`. The worker checks the exact request/session pair is active before making the provider call. This behavior is implemented but has not been verified against a signed-in Passport account; `PASSPORT_LIVE_ENABLED=false` and `PASSPORT_SESSION_ONLY_VERIFIED=false` remain in the private `.env`. The latter is an operator gate, not automated evidence. Complete a real approval and test rejection of an incorrect/expired session before enabling paid calls.

The worker serializes `use --session-id` and execution, checks the request ID and active session ID immediately before the query, and caches results by case. If an execution becomes uncertain, Veyra blocks another attempt. The installed CLI and the real account still need an end-to-end test; the adapter must not be described as verified until then.

## EasyPost gate

Test mode uses `EASYPOST_TEST_API_KEY`; live shipment mode uses `EASYPOST_PRODUCTION_API_KEY`. The keys are separate variables and the API response mode must match the requested mode. The response is reduced to status and a bounded set of tracking details. EasyPost production account billing is separate from Kite. This adapter does not prove contents, condition, intended recipient or delivery claim truth.

## Vercel deployment mode

The deployed web project is a public fixture demo only. It does not receive local `.env` values, Passport credentials, EasyPost keys or the local worker token. Vercel's ephemeral `/tmp` SQLite file is not durable and the local `127.0.0.1` worker cannot be reached from Vercel. Live Vercel use requires a durable database, an authenticated HTTPS worker host, hosted CLI/account setup, secrets in Vercel's encrypted environment, and verification of Passport behavior from that host.
