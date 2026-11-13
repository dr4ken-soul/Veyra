# Integration status

Last updated: 13 November 2026.

| Capability | Implemented | Verified in this workspace | Current gate |
|---|---|---|---|
| SERV Reasoning | OpenAI-compatible JSON-schema request and local validation for plans | Authenticated structured-output request succeeded locally with `gpt-6-luna`; the Veyra case route validated and saved the plan. The request omits `temperature: 0`, which this model rejects. | Credentials are configured in local `.env` and Vercel. Hosted SERV reasoning has not been exercised. |
| Sirenic company evidence | Fixed GB/FR company profile URLs, unpaid quote preflight, quote policy, subject matching and constrained Passport execution | Unpaid preflight returned HTTP 402 with a $0.005 Base USDC quote. A deliberately mismatched session was rejected before any provider request. One explicitly approved GET returned HTTP 200 with a subject-matched French registry record. Kite activity and a Base receipt confirmed the $0.005 USDC settlement. | Local live mode is enabled after the session checks. Vercel remains gated because it cannot reach the local worker. |
| EasyPost shipment evidence | Test/production tracker adapter with fixed endpoint, key server-side, response matching and no automatic retry after uncertainty | Veyra retrieved the official USPS test fixture `EZ4000000004`; EasyPost returned mode `test`, status `delivered`, and no payment was required. | Test key is configured locally. Production tracking requires a production key and is not needed for the test demo. |
| Kite Passport worker | Separate authenticated Node worker, CLI account sign-in, separate-session request, approval link validation, active-session check, fixed Sirenic allowlist, explicit `--session-id`, and idempotency cache | A wrong session ID was rejected with “No request was sent” while the worker stayed available. The approved request/session pair was checked as active and executed with its explicit session ID. The worker now reads Kite activity for a completed payment tied to that session before returning a confirmed receipt. | Local live mode requires the worker to be running and a new task-specific Passport approval for each paid operation. |
| Payments | Receipt states distinguish simulated, test/no payment, account billing, pending, confirmed and unknown | One $0.005 Base USDC Sirenic payment completed. Kite activity showed `completed`, and a read-only Base receipt check confirmed a successful transaction containing exactly 5,000 USDC base units. No EasyPost production billing occurred. | The app records the quote amount and confirmed receipt reference when Kite activity ties a completed x402 payment to the explicit session. |
| Fixtures | Synthetic supplier, shipment and registration evidence | Fixture demo builds locally; no live source is represented by fixtures | Always label as Simulated |
| Supabase persistence | Supabase Postgres tables, transaction-safe case mutations, and server-role-only RLS | Dedicated free project `Veyra` created in Homeplug Org; migrations applied, tables verified, and security advisor clear. Local and production case APIs passed create, idempotent replay, fetch, and list using fixture mode. | Server secret is configured in local `.env` and Vercel Production and Preview. |
| Vercel | Public fixture demo and authenticated case API | https://veyra-tau-mauve.vercel.app/demo and /api/healthz returned HTTP 200 after the latest production deployment. The hosted case API passed create, idempotent replay, fetch, and list using fixture mode. App credentials, SERV, EasyPost test key, Supabase settings, public URL and closed Passport gates are in Vercel. | Hosted Kite worker and paid Sirenic flow remain unavailable until an authenticated HTTPS worker is deployed and configured. The local worker is bound to loopback, so the hosted payment gate stays closed. |
| Webhooks | Not implemented | No callback or retry endpoint exists | Not available |

## SERV setup

The adapter uses `https://inference-api.openserv.ai/v1`, `SERV_REASONING_API_KEY` (with `SERV_API_KEY` as a legacy fallback), and `SERV_MODEL`. It sends the case fields to SERV only when the user requests an evidence plan. The local validator rejects refusal, truncation, invalid JSON, wrong capability and incomplete fields. A real structured-output request and full local case flow succeeded with `gpt-6-luna`; the request uses current SERV chat-completions parameters. Select a model from the [official model catalog](https://docs.openserv.ai/serv-reasoning/models) that is enabled for your account.

## Sirenic setup and payment boundary

The adapter constructs only `GET /v1/eu/entreprise/GB/{company_number}` or `GET /v1/entreprise/{siren}` for France. It reads `PAYMENT-REQUIRED`, accepts only Base USDC within Veyra's $0.05 ceiling, and stores the quoted amount, asset, network and recipient in the session metadata. The worker only allows these Sirenic paths and GET requests. A fresh quote is compared before execution, and one operation is reserved before sending the paid request.

The $0.005 quote was obtained without payment, then approved as a one-call session. One paid request returned HTTP 200 and a record matching the requested SIREN. Kite Passport activity associated the completed x402 payment with that session; a read-only Base receipt check confirmed the transaction succeeded and transferred exactly 5,000 USDC base units. This verifies the tested response and settlement path. It does not establish registry freshness for every company, source licence for every use, or service availability beyond this request.

## Passport gate

Kite documents that an allowance can pay when no usable session is selected. Veyra creates a fresh separate session using `kpass session create --separate --no-reuse`, checks that the exact request/session pair is active, then passes the approved ID explicitly to `kpass session execute --session-id`. In the live check, a mismatched ID was rejected before the provider request; the approved ID completed one capped GET. Passport activity tied the completed payment to that session, and a Base receipt confirmed settlement. `PASSPORT_LIVE_ENABLED=true` and `PASSPORT_SESSION_ONLY_VERIFIED=true` are set in the private local `.env`. A fresh, task-specific approval is still required for each paid operation.

The worker serializes operations, checks the request ID and active session ID immediately before the query, and caches results by idempotency key. If an execution becomes uncertain, Veyra blocks another attempt. After a successful query, the worker checks Kite activity for a completed x402 payment tied to the same session and returns its transaction reference when available. If activity cannot confirm it, the receipt remains `unknown` and must be checked before retrying.

## EasyPost gate

Test mode uses `EASYPOST_TEST_API_KEY`; live shipment mode uses `EASYPOST_PRODUCTION_API_KEY`. The keys are separate variables and the API response mode must match the requested mode. The response is reduced to status and a bounded set of tracking details. The test flow used EasyPost's official `EZ4000000004` USPS fixture and returned `delivered`; it made no production shipment or payment. EasyPost production account billing is separate from Kite. This adapter does not prove contents, condition, intended recipient or delivery claim truth.

## Vercel deployment mode

The public fixture demo and authenticated case API are deployed on Vercel. After the Supabase secret was added, the production API successfully created a fixture case, replayed the idempotent request, fetched the case, and listed it. The deployed API uses the dedicated Supabase project instead of Vercel's ephemeral `/tmp` SQLite file. The local `127.0.0.1` Kite worker cannot be reached from Vercel, so the Passport live gates remain `false` in Vercel. Hosted company evidence requires an authenticated HTTPS worker reachable by Vercel; local session verification does not enable the hosted flow.

### Supabase environment values

The dedicated project is `jxwbvxropvzhfjgfilim` in `us-east-1`. Set `SUPABASE_URL=https://jxwbvxropvzhfjgfilim.supabase.co` and `SUPABASE_SECRET_KEY` using the server-only `sb_secret_...` value in [Veyra's Supabase API Keys settings](https://supabase.com/dashboard/project/jxwbvxropvzhfjgfilim/settings/api-keys). A legacy `service_role` key also works. Do not use the `sb_publishable_...` or `anon` key for this variable. Keep both values in the private local `.env` and Vercel's encrypted server environment; never prefix them with `NEXT_PUBLIC_`.
