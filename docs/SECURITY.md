# Security and release limits

## Current protections

- API reads and mutations require a workspace session or bearer API key, except public liveness and capability status.
- The private workspace has an HTTP-only, signed, same-site cookie. A Next.js Proxy preserves the requested deep link on sign-in, while API routes independently enforce authentication.
- Database reads include the local organisation identifier. The current authentication model provisions only one workspace and is not a multi-tenant auth provider.
- Case schemas accept only the fields required for each scenario. Arbitrary URLs, billing destinations, unknown fields and full bank details are rejected.
- Browser mutations verify the request origin. API keys use constant-time comparison and are never returned to the client.
- SERV can only use the official inference host. Redirects are rejected. Responses are checked for refusal, truncation, JSON shape, scenario capability and required fields before a plan is stored.
- Evidence is represented as untrusted fixture data. It is not treated as instructions and never authorizes spending.
- Fixture execution stores a simulated payment state with null amount, asset, network and transaction reference. It has no real payment integration.
- User review notes redact long digit runs before storage. API and UI errors do not expose stack traces or secrets.
- Default response headers deny framing and disable camera, microphone and geolocation access.

## Important limitations

This is a local hackathon build, not a production security audit. Login is a single password stored in .env, API access is a single workspace bearer key, rate limits are process-local, and SQLite is local storage through Node.js built-in node:sqlite, which is experimental in the bundled Node release. There is no organisation onboarding, membership/role model, credential issuance/revocation screen, durable distributed queue, webhook delivery, formal retention/deletion control, monitoring or incident response.

The build has no verified provider, no Passport session execution and no payment path. The SERV adapter has not been exercised with credentials. Do not send confidential customer information to SERV or deploy real user data before reviewing the provider's current privacy and retention terms.

## Secret handling

The local .env file is ignored by Git. Keep it private. Do not send it to GitHub, screenshots, video or logs. Use a managed secret store for any deployment. Rotate the local login password, API key and signing secret if the file is shared.

## Release requirements

Before a production or public-user launch, replace the local sign-in with a server-verifiable identity provider, deploy a durable database with tenant isolation, define retention and deletion, audit all providers and source terms, add replay-protected callbacks only if required, and complete an independent security and privacy review. Do not enable live payments until the Passport session-only and quote-integrity gates are proven.