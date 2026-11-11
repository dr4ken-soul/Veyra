# Veyra

**Buy the proof before you decide.**

Veyra turns a business evidence gap into a narrow case, a validated SERV plan, a source-aware receipt and a human review. It supports company registration lookups through Sirenic and carrier tracking through EasyPost. A company registry record never proves bank-account ownership, and Veyra never releases an invoice.

## Integration status

The SERV, Sirenic x402, EasyPost and Kite Passport adapters are implemented. The current local `.env` is real and ignored by Git, but external API credentials are blank. No authenticated SERV request, EasyPost request, Passport approval, or paid Sirenic call has been made here. A no-payment Sirenic quote preflight returned HTTP 402 and its Base USDC quote was inspected. Live company cases stay disabled until SERV and the Kite worker are configured and the explicit-session payment path has been verified. Shipment test and live modes use separate EasyPost test and production keys.

The public [Vercel demo](https://veyra-tau-mauve.vercel.app/demo) is a fixture demo. It is not configured for live calls: the local Kite worker URL and local SQLite database are not suitable Vercel production services. See [integration status](docs/INTEGRATION_STATUS.md) and [security limits](docs/SECURITY.md).

## Run locally on S:

The project, npm cache, dependencies, Kite CLI and local database are kept under `S:\Hackathon\Veyra`. Node.js, npm and Git were already available on the machine; this build did not install tools or project files on `C:`.

1. Open a terminal in `S:\Hackathon\Veyra`.
2. Install JavaScript dependencies with `npm install` if needed.
3. In one terminal, run `npm run kite:worker`.
4. In another terminal, run `npm run dev`.
5. Open `http://localhost:3000` or the synthetic public demo at `http://localhost:3000/demo`.
6. Sign into the local workspace with `APP_LOGIN_PASSWORD` from the private `.env` file.

The Kite CLI is installed at `.kpass\bin\kpass.exe`, on `S:`. It is not added to the global Windows PATH. The CLI is not signed into a Passport account. To configure a real account, sign in from this project directory using the official Kite installation and login instructions; keep its `.kite-passport` state under this project.

## Environment values

The private `.env` already exists in the project root. It has locally generated app credentials and a worker token; do not paste it into chat, screenshots, GitHub or a demo recording. External provider fields are left blank until you obtain your own credentials.

| Variable | What it is | How to get or set it |
|---|---|---|
| `APP_LOGIN_PASSWORD` | Password for this single-user local workspace | Set a long private password of your own. It is not a provider credential. |
| `AUTH_SECRET` | Random key used to sign the local session cookie | Keep the generated value, or generate a new random value of 32+ characters. |
| `VYERA_API_KEY` | Local API bearer key | Keep the generated value or generate a new random value. |
| `DATABASE_PATH` | SQLite filename under `data\` | Local path only; the current value avoids the older smoke-test database. |
| `SERV_REASONING_API_KEY` | OpenServ SERV API key used for evidence planning | [Create an OpenServ account](https://console.openserv.ai/signup), then create an API key in the [SERV console](https://console.openserv.ai/). The official guide is [Add credits and create an API key](https://docs.openserv.ai/serv-reasoning/tutorials/credits-and-api-keys). |
| `SERV_MODEL` | SERV model ID, not a key | Choose one available to your account from the [model catalog](https://docs.openserv.ai/serv-reasoning/models). Do not guess a model name. |
| `SERV_BASE_URL` | SERV API base URL | Leave as `https://inference-api.openserv.ai/v1`; see the official [API overview](https://docs.openserv.ai/serv-reasoning/api). |
| `EASYPOST_TEST_API_KEY` | EasyPost test API key for shipment tracking checks | Create/copy a **Test** key from the [EasyPost dashboard](https://app.easypost.com), under API Keys. EasyPost requires an account wallet and a ship-from address before key access. See [EasyPost authentication](https://docs.easypost.com/docs/authentication). |
| `EASYPOST_PRODUCTION_API_KEY` | EasyPost production API key for live tracking | Copy the **Production** key from the same [EasyPost dashboard](https://app.easypost.com). Live tracker creation is billed by EasyPost. Keep blank until you intend to run a real lookup. |
| `KITE_WORKER_URL` | Private server-to-server URL for the Passport worker | Local default is `http://127.0.0.1:8787`. A hosted app needs a deployed HTTPS worker URL. |
| `KITE_WORKER_TOKEN` | Shared secret between Veyra and the Kite worker | A strong local random token is already generated. Keep the same value on both services. |
| `KITE_CLI_PATH` | Path to the Kite `kpass` executable | Already points to `.kpass\bin\kpass.exe` under this project. |
| `KITE_WORKER_HOST`, `KITE_WORKER_PORT` | Local worker bind address and port | Defaults are loopback-only and `8787`; keep the worker off public interfaces. |
| `KITE_WORKER_DATA_DIR` | Local idempotency result cache | Keep the default `.kite-worker-data` folder; it is ignored by Git. |
| `KITE_SESSION_TTL` | Maximum lifetime requested for a Passport session | Defaults to `20m`; the user approves the actual session in Passport. |
| `PASSPORT_SESSION_ONLY_VERIFIED` | Operator gate for enabling paid Sirenic queries | Keep `false` until a live approval and explicitly selected session have been verified, including wrong/expired session rejection. Veyra requests a separate session with `--separate --no-reuse` and always passes the approved `--session-id` to execution. |
| `PASSPORT_LIVE_ENABLED` | Master switch for live Sirenic x402 requests | Leave `false` until the worker is signed in, funded, and the session-only checks have passed. Then set `true`. |
| `PUBLIC_APP_URL` | Public or local URL shown in links | Local default is `http://localhost:3000`; set a deployed HTTPS address when needed. |

The legacy `SERV_API_KEY` is accepted as a fallback for `SERV_REASONING_API_KEY`. Do not use `SIRENIC_API_KEY`: the live company adapter intentionally uses x402 through Kite Passport, not Sirenic account-credit billing.

Passport setup links: [install and sign in to the official CLI](https://docs.gokite.ai/passport/install), [review session and allowance behavior](https://docs.gokite.ai/passport/payments/allowance), [fund the wallet](https://docs.gokite.ai/passport/payments/funding), and [open the Passport dashboard](https://agentpassport.ai/overview). The application requires a fresh separate session approval and an explicit session ID before it can pay. Fund only what you intend to spend. Sirenic's x402 path does not need a Sirenic API key; its unpaid 402 quote is fetched before the user approves the requested spend.

## Scenario coverage

- **Supplier change:** Sirenic company identity evidence. It cannot verify bank-account ownership or authorise a payment-detail change; the invoice remains for human review.
- **Business registration:** Sirenic company profile for supported Great Britain or France identifiers. Confirm the exact register, coverage, freshness and licence shown by the provider.
- **Shipment:** EasyPost tracker in test or production mode. Carrier status does not prove package contents, condition or the intended recipient.
- **Fixture:** synthetic data and a simulated payment label only. No external call or payment occurs.

SERV must return a schema-valid plan before any provider request. A failed or malformed plan blocks execution. Paid and account-billed operations are claimed before the request and are not automatically retried after an uncertain outcome.

## API overview

All paths below are under `/api`.

- `GET /healthz` is public liveness only.
- `GET /v1/capabilities` reports configuration without exposing secret values.
- `POST /v1/cases` creates a fixture, test shipment, or configured live case. Unknown fields and arbitrary URLs are rejected.
- `GET /v1/cases` and `GET /v1/cases/{id}` return workspace-scoped cases.
- `POST /v1/cases/{id}/plan` creates a SERV plan for test/live, or a simulated or SERV plan for a fixture.
- `POST /v1/cases/{id}/sessions` preflights the Sirenic quote and requests a Passport session for live company cases.
- `GET /v1/cases/{id}/sessions` refreshes Passport session state.
- `POST /v1/cases/{id}/execute` runs a synthetic fixture, EasyPost shipment lookup, or approved Sirenic query according to the case mode.
- `GET /v1/cases/{id}/receipt` downloads a redacted JSON receipt.
- `POST /v1/cases/{id}/review` records a human review. It never pays an invoice.

API-key requests use `Authorization: Bearer <VYERA_API_KEY>`. Browser mutations use the signed session cookie and same-origin checks. The OpenAPI contract is in `openapi.yaml`.

## Deployment

Vercel serves the public fixture demo. Keep live providers disabled there until a durable database and an HTTPS-hosted Kite worker are deployed and the Passport session-only behavior is verified. Vercel serverless local files under `/tmp` are not durable storage. For now, use the local app and worker for provider integration testing.

## Build checks

- `npm run typecheck`
- `npm run build`
- `npm run start`

There is no automated test suite in this edition. A successful build does not prove provider credentials, Passport account settings, or payment settlement.

## Submission materials

[SUBMISSION.md](SUBMISSION.md) and [MARKETING.md](MARKETING.md) are drafts. Do not state a live request or payment happened until you have evidence from the real provider and Passport activity. The X post and hackathon form have not been published or submitted.
