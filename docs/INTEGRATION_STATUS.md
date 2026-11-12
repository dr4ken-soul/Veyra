# Integration status

Last updated: 12 November 2026.

| Capability | Implemented | Verified in this workspace | Current gate |
|---|---|---|---|
| SERV Reasoning | OpenAI-compatible JSON-schema request and local validation for plans | Authenticated structured-output request succeeded locally with `gpt-6-luna`; the Veyra case route validated and saved the plan. The request omits `temperature: 0`, which this model rejects. | Credentials are configured in local `.env` and Vercel. Hosted SERV reasoning has not been exercised. |
| Sirenic company evidence | Fixed GB/FR company profile URLs, unpaid quote preflight, quote policy, subject matching and constrained Passport execution | A free no-payment GET to the public French profile returned HTTP 402; its Base USDC quote format was inspected. No paid call, response or provider signature was verified | Configure Passport and prove x402 compatibility and session-only behavior |
| EasyPost shipment evidence | Test/production tracker adapter with fixed endpoint, key server-side, response matching and no automatic retry after uncertainty | Veyra retrieved the official USPS test fixture `EZ4000000004`; EasyPost returned mode `test`, status `delivered`, and no payment was required. | Test key is configured locally. Production tracking requires a production key and is not needed for the test demo. |
| Kite Passport worker | Separate authenticated Node worker, Kite CLI 6.13.2 session/delegation commands, separate-session request, approval link validation, active-session check, fixed Sirenic allowlist, explicit `--session-id`, and idempotency cache | The project-local Windows CLI reports `Not logged in`. No Passport session approval or paid request was verified. | Sign in and create/use a passkey, approve a separate session, then verify explicit-session execution and rejection of a wrong or expired session before setting `PASSPORT_SESSION_ONLY_VERIFIED=true` |
| Payments | Receipt states distinguish simulated, test/no payment, account billing, pending, confirmed and unknown | No transaction or EasyPost production billing occurred | Only Passport worker-reported status is saved; independently inspect Passport activity before claiming settlement |
| Fixtures | Synthetic supplier, shipment and registration evidence | Fixture demo builds locally; no live source is represented by fixtures | Always label as Simulated |
| Supabase persistence | Supabase Postgres tables, transaction-safe case mutations, and server-role-only RLS | Dedicated free project `Veyra` created in Homeplug Org; migrations applied, tables verified, and security advisor clear. Local and production case APIs passed create, idempotent replay, fetch, and list using fixture mode. | Server secret is configured in local `.env` and Vercel Production and Preview. |
| Vercel | Public fixture demo and authenticated case API | `https://veyra-tau-mauve.vercel.app/demo` and `/api/healthz` returned HTTP 200 after the latest production deployment. The hosted case API passed create, idempotent replay, fetch, and list in fixture mode. App credentials, SERV, EasyPost test key, Supabase settings, public URL and closed Passport gates are in Vercel. | Hosted Kite worker and paid Sirenic flow remain unavailable until an HTTPS worker and Passport session behavior are verified. |
| Webhooks | Not implemented | No callback or retry endpoint exists | Not available |

## SERV setup

The adapter uses `https://inference-api.openserv.ai/v1`, `SERV_REASONING_API_KEY` (with `SERV_API_KEY` as a legacy fallback), and `SERV_MODEL`. It sends the case fields to SERV only when the user requests an evidence plan. The local validator rejects refusal, truncation, invalid JSON, wrong capability and incomplete fields. A real structured-output request and full local case flow succeeded with `gpt-6-luna`; the request uses current SERV chat-completions parameters. Select a model from the [official model catalog](https://docs.openserv.ai/serv-reasoning/models) that is enabled for your account.

## Sirenic setup and payment boundary

The adapter constructs only `GET /v1/eu/entreprise/GB/{company_number}` or `GET /v1/entreprise/{siren}` for France. It reads `PAYMENT-REQUIRED`, accepts only Base USDC within Veyra's $0.05 ceiling, and stores the quoted amount, asset, network and recipient in the session metadata. The worker only allows these Sirenic paths and GET requests. A fresh quote is compared before execution, and one operation is reserved before sending the paid request.

The quote preflight was unpaid. This does not verify the result fields, registry freshness for a given number, source licence for a given use, Kite merchant compatibility, settlement, or the session's binding to the approved quote.

## Passport gate

Kite documents that an allowance can pay when no usable session is selected. Veyra avoids that implicit path in code: it creates a fresh separate session using `kpass session create --separate --no-reuse` and passes its approved ID explicitly to `kpass session execute --session-id`. The worker checks the exact request/session pair is active before making the provider call. This behavior is implemented but has not been verified against a signed-in Passport account; `PASSPORT_LIVE_ENABLED=false` and `PASSPORT_SESSION_ONLY_VERIFIED=false` remain in the private `.env`. The latter is an operator gate, not automated evidence. Complete a real approval and test rejection of an incorrect/expired session before enabling paid calls.

The worker serializes `use --session-id` and execution, checks the request ID and active session ID immediately before the query, and caches results by case. If an execution becomes uncertain, Veyra blocks another attempt. The installed CLI and the real account still need an end-to-end test; the adapter must not be described as verified until then.

## EasyPost gate

Test mode uses `EASYPOST_TEST_API_KEY`; live shipment mode uses `EASYPOST_PRODUCTION_API_KEY`. The keys are separate variables and the API response mode must match the requested mode. The response is reduced to status and a bounded set of tracking details. The test flow used EasyPost's official `EZ4000000004` USPS fixture and returned `delivered`; it made no production shipment or payment. EasyPost production account billing is separate from Kite. This adapter does not prove contents, condition, intended recipient or delivery claim truth.

## Vercel deployment mode

The public fixture demo and authenticated case API are deployed on Vercel. After the Supabase secret was added, the production API successfully created a fixture case, replayed the idempotent request, fetched the case, and listed it. The deployed API uses the dedicated Supabase project instead of Vercel's ephemeral `/tmp` SQLite file. The local `127.0.0.1` Kite worker cannot be reached from Vercel. Hosted company evidence also requires an authenticated HTTPS worker and verified Passport behavior from that host.

### Supabase environment values

The dedicated project is `jxwbvxropvzhfjgfilim` in `us-east-1`. Set `SUPABASE_URL=https://jxwbvxropvzhfjgfilim.supabase.co` and `SUPABASE_SECRET_KEY` using the server-only `sb_secret_...` value in [Veyra's Supabase API Keys settings](https://supabase.com/dashboard/project/jxwbvxropvzhfjgfilim/settings/api-keys). A legacy `service_role` key also works. Do not use the `sb_publishable_...` or `anon` key for this variable. Keep both values in the private local `.env` and Vercel's encrypted server environment; never prefix them with `NEXT_PUBLIC_`.
