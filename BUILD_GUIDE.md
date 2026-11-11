# Veyra | Build and release guide

Status: local integration code is implemented. External credentials and end-to-end provider verification are outstanding. Vercel is fixture-only because its SQLite storage is ephemeral and the Passport worker is not hosted there.

## Implemented

- Next.js application, public synthetic demo and local single-workspace screens.
- Scenario-specific supplier-change, shipment-status and business-registration schemas.
- SQLite case store, operation lock, event history, redacted JSON receipt and human-review record.
- SERV structured-output adapter with local schema validation and refusal/truncation handling.
- Sirenic company profile quote preflight for GB/FR, policy checks and a Kite Passport session execution route.
- EasyPost tracker adapter for test and production modes, with response matching, bounded tracking data and conservative payment/billing states.
- Separate loopback-first Kite worker with bearer authentication, official CLI commands, session refresh, fixed endpoint allowlist and idempotency cache.
- `.env` created locally, ignored by Git, with generated app and worker secrets. Provider credentials are intentionally blank.
- Kite CLI installed locally under `.kpass` on `S:` without adding it to the Windows user PATH.

## Remaining before a live evidence result

1. Add an eligible SERV key and account-supported model, then make a real schema request and record its actual request ID.
2. Add an EasyPost test key; verify a test tracker. Use a production key only after reviewing account billing and intentionally choosing a real tracking operation.
3. Sign into Passport from the local worker environment, set up a passkey and fund only a chosen amount.
4. Approve a Passport separate session and verify Veyra rejects a mismatched or expired session before execution. Only then set `PASSPORT_SESSION_ONLY_VERIFIED=true` and `PASSPORT_LIVE_ENABLED=true`.
5. Verify Sirenic's current result shape, provenance, licensing for the intended use and any payment transaction in Passport activity.
6. Do not enable Vercel live mode until a durable database and HTTPS-hosted worker are available; the deployed demo remains fixture-only.

## Local commands

Run from `S:\Hackathon\Veyra`:

    npm install
    npm run kite:worker

In a second terminal:

    npm run dev

The local `.env` sets the worker URL to `http://127.0.0.1:8787`, the app URL to `http://localhost:3000`, and both Passport live gates off. Keep project dependencies, `.kpass`, local data, npm cache, and build output under this project.

## Verification commands

    npm run typecheck
    npm run build
    npm run start

There is no automated test suite in this edition. Type checking and building do not verify account credentials, provider terms, session binding or settlement.

## Safety invariants

- The model cannot authorize a payment or choose an arbitrary provider or URL.
- No full bank details are accepted for a registry lookup.
- Fixture results remain synthetic and label payment as simulated.
- EasyPost test, production and fixture modes remain visibly distinct.
- Passport live execution stays off until the exact active request/session pair is verified and an explicit session ID is passed to execute.
- A SERV failure, refusal, truncation or invalid schema prevents evidence execution.
- An uncertain provider operation is blocked against automatic retry.
- Company registration is not treated as bank-account ownership.
- Veyra does not release invoices, move invoice funds or claim fraud prevention.

## Submission calendar

The supplied Hackathon Edition 02 deadline is 15 November 2026 at 23:59 UTC (16 November at 00:59 in Lagos). Check the official [hackathon page](https://www.openserv.ai/hackathon-2) before submitting.
