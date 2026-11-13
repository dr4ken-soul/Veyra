# Veyra | Build and release guide

Status as of 13 November 2026: the Vercel app and Supabase case store are deployed and verified. SERV and EasyPost test calls succeeded locally. Local and hosted Veyra flows each completed one $0.005 Sirenic request through a separately approved Passport session; both were confirmed in Passport activity and Base receipts, and a mismatched session ID was rejected before a provider request. Production Vercel's named Sandbox is signed in as the registered Veyra buyer agent; the Production live gates are enabled after the full hosted UI/API case flow succeeded. The public demo remains synthetic. Edition 02 is the target.

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
- Production uses a named, persistent Vercel Sandbox for the Kite CLI because Vercel Functions cannot access a developer's loopback worker. The sandbox has no public ports; it snapshots the CLI login between short sessions. Keep its snapshots protected and its session timeout short.
- The worker returns a confirmed payment reference when Kite activity reports a completed x402 payment tied to the same session. Rejected asynchronous operations return a bounded error and leave the worker available.

## Remaining submission work

1. Review source licensing and complete an independent security/privacy review before making general public-production claims. No EasyPost production tracker was run.
2. Publish the prepared X post and submit the repository, demo and write-up through the [official Edition 02 page](https://www.openserv.ai/hackathon-2) by 15 November 2026 at 23:59 UTC.

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
- Production Passport execution is enabled only with the private named Sandbox, quote checks, exact active request/session verification and explicit approved session ID. Every new paid operation still requires a fresh user approval.
- A SERV failure, refusal, truncation or invalid schema prevents evidence execution.
- An uncertain provider operation is blocked against automatic retry.
- Company registration is not treated as bank-account ownership.
- Veyra does not release invoices, move invoice funds or claim fraud prevention.

## Submission calendar

The supplied Hackathon Edition 02 deadline is 15 November 2026 at 23:59 UTC (16 November at 00:59 in Lagos). Check the official [hackathon page](https://www.openserv.ai/hackathon-2) before submitting.
