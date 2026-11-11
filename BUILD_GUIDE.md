# Veyra | Build and release guide

Status: runnable local hackathon edition implemented in fixture mode. See docs/INTEGRATION_STATUS.md for verified integrations and blockers. The local build is not a production release.

## Implemented in this repository

- Next.js App Router application with the approved landing page, public simulated demo and local workspace screens.
- Supplier-change, shipment-status and business-registration case schemas, each limited to its scenario-specific fields.
- Local SQLite case store, scoped API reads, idempotent case creation, event history, redacted JSON receipt and human review record.
- SERV structured-output adapter behind server configuration, with local schema validation, refusal/truncation handling and no request when the user has not configured a key/model.
- Synthetic fixture adapter. Source, operator, mode, payment status and limitations are explicit.
- Session-only Passport controls are unavailable and fail closed. No live payment code or verified provider is enabled.
- TypeScript type check and production build are the required local validation commands.

## Release blockers

1. **SERV proof:** configure an eligible SERV key and model, make a real schema-constrained request, retain the true request identifier and confirm refusal/truncation behaviour. No request has been run in the current environment.
2. **Evidence source:** inspect and test an exact endpoint, source licence, jurisdiction, query/matching semantics, price and Passport compatibility. No registry, shipment or bank-account ownership source is verified.
3. **Passport session binding:** prove the actual installed integration uses the task-specific session for each query and cannot pay from a shared allowance when the session is absent or expired. The app keeps live execution disabled.
4. **Quote integrity:** verify price, receiver, asset, network, host, path and method before execution. If the integration cannot bind these values to settlement, do not enable live calls.
5. **Real test path:** verify the provider, token, facilitator, network and independent transaction record end to end. A local 402 or fixture does not count.
6. **Deployment:** choose a Node.js host and durable database, configure HTTPS, identity, secrets, backups and observability. The current SQLite store is local.
7. **Submission proof:** produce a demo video or deploy an HTTPS demo; publish an accurate short write-up and X post; submit their URLs through the hackathon form. The drafts are in SUBMISSION.md.
8. **Production review:** replace single-workspace local auth, add a durable tenant model and retention/deletion controls, then complete security, privacy and source-licence review.

## Local installation

Run these commands from S:\Hackathon\Veyra:

    npm install
    npm run dev

The private .env file is already present in the local build folder and is ignored by Git. It defaults to APP_MODE=fixture. For a fresh clone, create .env as described in README.md. Keep npm cache, temporary files and build output inside this project directory.

## Local verification

    npm run typecheck
    npm run build
    npm run start

The current implementation has no automated test suite. A build does not verify external service access, provider eligibility, Passport session binding or settlement.

## Implementation safety invariants

- Case input is scenario-specific. Model output cannot choose a URL, provider or payment destination.
- No full bank details are collected for a company registry lookup.
- No data source is called in fixture mode; fixture evidence and payment are always labelled simulated.
- Test and live modes are rejected by the API and disabled in the interface.
- No missing-session or expired-session allowance fallback is allowed.
- A SERV request failure, refusal, truncation or invalid schema prevents evidence execution.
- The supplier decision remains open when bank-account ownership is not established.
- Veyra does not release invoices, move funds or claim fraud prevention.

## Submission calendar

The supplied deadline is 15 November 2026, 23:59 UTC, or 16 November at 00:59 in Lagos. Confirm the official rules and deadline before submitting.