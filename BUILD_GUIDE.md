# Veyra | Build and release guide

Status as of 12 November 2026: the Vercel app and Supabase case store are deployed and verified. SERV and EasyPost test credentials are configured; local SERV and EasyPost test calls succeeded. Kite Passport is signed in locally with a registered Veyra buyer agent. One paid Sirenic session approval and call remain outstanding. Vercel's Passport gate stays closed because the Kite worker is local rather than HTTPS-hosted.

## Implemented

- Next.js application, public synthetic demo and local single-workspace screens.
- Scenario-specific supplier-change, shipment-status and business-registration schemas.
- SQLite case store, operation lock, event history, redacted JSON receipt and human-review record.
- SERV structured-output adapter with local schema validation and refusal/truncation handling.
- Sirenic company profile quote preflight for GB/FR, policy checks and a Kite Passport session execution route.
- EasyPost tracker adapter for test and production modes, with response matching, bounded tracking data and conservative payment/billing states.
- Separate loopback-first Kite worker with bearer authentication, official CLI commands, session refresh, fixed endpoint allowlist and idempotency cache.
- `.env` is created locally and ignored by Git. Provider and app secrets remain server-side; never copy their values into source or documentation.
- Kite CLI is installed under `.kpass` on `S:` without adding it to the Windows user PATH. The local account and buyer agent are set up; the Passport session and paid provider call are not yet verified.

## Remaining before a live evidence result

1. SERV credentials and model are configured; re-run a real hosted request before claiming hosted SERV verification.
2. EasyPost test credentials are configured and the official test tracker succeeded. Use a production key only after reviewing account billing and intentionally choosing a real tracking operation.
3. The local Passport account and Veyra buyer agent are registered. Approve a separate Base USDC session capped to the fresh provider quote; the current unpaid quote was `$0.005` for one French registry lookup.
4. With the local worker, verify rejection of a mismatched session ID, then make one correctly scoped request and confirm Passport activity. Only then set local `PASSPORT_SESSION_ONLY_VERIFIED=true`.
5. Keep Passport payments disabled on Vercel until an HTTPS-hosted worker is available. Verify Sirenic's result shape and provenance, review source licensing, and independently confirm any payment in Passport activity.

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
