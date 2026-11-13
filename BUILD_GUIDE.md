# Veyra | Build and release guide

Status as of 13 November 2026: the Vercel app and Supabase case store are deployed and verified. SERV and EasyPost test calls succeeded locally. One $0.005 Sirenic request completed through a separately approved Passport session; a mismatched session ID was rejected, Kite activity recorded completion, and a Base receipt confirmed settlement. Local Passport live mode is enabled. Vercel's Passport gate stays closed because the Kite worker is local rather than HTTPS-hosted.

## Implemented

- Next.js application, public synthetic demo and local single-workspace screens.
- Scenario-specific supplier-change, shipment-status and business-registration schemas.
- SQLite case store, operation lock, event history, redacted JSON receipt and human-review record.
- SERV structured-output adapter with local schema validation and refusal/truncation handling.
- Sirenic company profile quote preflight for GB/FR, policy checks and a Kite Passport session execution route.
- EasyPost tracker adapter for test and production modes, with response matching, bounded tracking data and conservative payment/billing states.
- Separate loopback-first Kite worker with bearer authentication, official CLI commands, session refresh, fixed endpoint allowlist and idempotency cache.
- `.env` is created locally and ignored by Git. Provider and app secrets remain server-side; never copy their values into source or documentation.
- Kite CLI is installed under `.kpass` on `S:` without adding it to the Windows user PATH. The local account and buyer agent are set up; one approved explicit-session paid provider call is verified. A fresh approval is required for every future paid operation.
- The worker returns a confirmed payment reference when Kite activity reports a completed x402 payment tied to the same session. Rejected asynchronous operations return a bounded error and leave the worker available.

## Remaining release work

1. Exercise the full Veyra case UI/API flow through planning, session approval, execution and receipt. The verified paid request in this build was run through the worker, and its one-call session is consumed.
2. A further paid end-to-end test needs a fresh task-specific Passport approval capped to Sirenic's current quote; do not reuse the consumed session.
3. Keep Passport payments disabled on Vercel until an authenticated HTTPS worker is deployed and configured. The loopback worker cannot serve Vercel functions.
4. Review source licensing and run an independent security/privacy review before any production claim. No EasyPost production tracker was run.
5. OpenServ Hackathon Edition 01 ended on 28 September 2026. Check the official page for a new edition before publishing a submission.

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
