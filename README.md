# Veyra

**Buy the proof before you decide.**

Veyra is a small evidence workflow for business decisions. It accepts three narrow case types, plans an evidence question, records source and payment status separately, and routes unresolved decisions to a person.

## Current build status

This repository contains a runnable hackathon edition in fixture mode. The public demo and local workspace use synthetic data. The workspace can create cases, create a deterministic simulated plan or an optional SERV plan, run a synthetic evidence fixture, export a redacted JSON receipt, and record a human review.

No external evidence provider is configured or verified. Kite Passport session creation and live payments are disabled. A simulated receipt is not a payment receipt, and no transaction is made. The supplier scenario never treats a company record as proof of bank-account ownership.

## Run locally

Use Node.js 24 or another supported Node version at least 20.9. npm dependencies and build output are kept inside this project folder when following these steps.

1. Open a terminal in S:\Hackathon\Veyra.
2. Install dependencies with npm install.
3. Start the app with npm run dev.
4. Open http://localhost:3000 for the landing page or http://localhost:3000/demo for the public synthetic demo.
5. Choose Open the local workspace and sign in with APP_LOGIN_PASSWORD from the private .env file in this folder.

The project includes a real local .env file on the build machine. It is ignored by Git and contains generated local credentials. It is not included in this repository. On a clean clone, create .env in the project root with the following settings, then generate fresh values for AUTH_SECRET, APP_LOGIN_PASSWORD and VYERA_API_KEY:

    APP_MODE=fixture
    APP_ORG_ID=veyra-local-workspace
    APP_LOGIN_PASSWORD=<generate-a-long-random-value>
    AUTH_SECRET=<at-least-32-random-characters>
    VYERA_API_KEY=<generate-a-long-random-value>
    DATABASE_PATH=./data/veyra.sqlite
    SERV_BASE_URL=https://inference-api.openserv.ai/v1
    SERV_REASONING_API_KEY=
    SERV_API_KEY=
    SERV_MODEL=
    PASSPORT_LIVE_ENABLED=false
    PUBLIC_APP_URL=http://localhost:3000

To add SERV planning, put an eligible key in SERV_REASONING_API_KEY, set SERV_MODEL to a model available to that account, and restart the app. The older SERV_API_KEY variable is accepted as a fallback. A user who requests a plan sends the case fields to the configured SERV endpoint. Without those settings, Veyra uses the local simulated planner. No credentials are provided in this repository, and no live SERV request has been confirmed.

## Workspace access and data

The local workspace uses a single owner password and an HTTP-only, signed session cookie. The API also accepts the one workspace bearer key in VYERA_API_KEY. This is a local hackathon access layer, not a production identity provider or a multi-tenant organisation system.

Cases are stored in data/veyra.sqlite under the project folder. This local persistence uses Node.js built-in node:sqlite, which emits an experimental-feature warning in the bundled Node release; use a managed database before deployment. Only the scenario fields needed by the selected workflow are accepted. Full bank account numbers, arbitrary URLs and payment destinations are not accepted as case fields. Use synthetic data in this build.

## API overview

All API paths below are under /api.

- GET /healthz is public liveness only.
- GET /v1/capabilities shows the configured mode and verified integration state.
- POST /v1/cases creates a fixture case. The request contains scenario, mode and scenario-specific input. Unknown fields are rejected.
- GET /v1/cases and GET /v1/cases/{id} return cases scoped to the local workspace.
- POST /v1/cases/{id}/plan validates a SERV or simulated plan. GET the same path to read it.
- POST /v1/cases/{id}/execute runs only the synthetic fixture adapter.
- GET /v1/cases/{id}/receipt downloads a redacted JSON receipt.
- POST /v1/cases/{id}/review records a human review action. It never pays an invoice.
- POST /v1/cases/{id}/sessions always fails closed while live session controls are unverified.
- GET /v1/sessions/{id} and GET /v1/operations/{id} return status without credentials.

Authenticated API requests use Authorization: Bearer followed by the workspace API key. Browser mutations use the signed session cookie and same-origin checks. The OpenAPI contract is in openapi.yaml.

## Checks

- npm run typecheck performs the TypeScript check.
- npm run build creates the production build.
- npm run start serves the built application.

There is no automated test suite in this edition. Do not treat a passing build as evidence of a verified payment integration or provider source.

## Build and submission notes

- docs/INTEGRATION_STATUS.md records what is and is not verified.
- docs/SECURITY.md describes the current security boundary and release limitations.
- SUBMISSION.md contains an accurate write-up, demo outline and draft X post.
- APP_BLUEPRINT.md, FRONTEND_SPEC.md, PRODUCT.md, BUILD_GUIDE.md, CLAUDE.md and MARKETING.md preserve the supplied requirements and current implementation status.

Before public deployment, configure a proper identity provider and durable database, run a real SERV schema request, verify source terms and a real provider, prove session-only Passport execution without allowance fallback, and complete security and privacy review. No live controls should be enabled until those checks pass.