# Veyra | Project context

Status: SERV, EasyPost test, Supabase, and one local plus one hosted Passport paid lookup have been verified. Edition 02 is the target. Vercel's Production Passport adapter uses a private persistent Sandbox with a signed-in, registered Veyra buyer agent; the hosted UI/API flow and Base receipt succeeded, so the Production per-call gate is enabled. The public demo remains synthetic. This hackathon build has not had an independent security/privacy audit and is not general-purpose production auth.

## Product

Veyra helps a workflow identify missing evidence for a specific decision. A case uses one narrow scenario, a bounded evidence plan, a source-aware receipt and a human review. The supplier-change flow does not treat a company registry record as proof of bank-account ownership. Veyra does not release invoices or transfer invoice funds.

## Current implementation

- Next.js 16 App Router, React, TypeScript and custom responsive CSS.
- Local SQLite store in the project folder.
- Public synthetic demo and single-workspace local sign-in.
- Scenario-specific case API for supplier, shipment and registration.
- Server-side SERV structured-output adapter. The local .env has the key and model configured, and a structured-output request was verified locally.
- Sirenic company-profile x402 adapter for Great Britain and France, gated by a fresh quote and Passport session.
- EasyPost shipment adapter for test and production modes, gated by environment-specific API keys.
- Kite Passport CLI worker installed under `.kpass` in this project and signed in. One separately approved, explicit-session-ID Sirenic request and its Base USDC settlement were verified; local live gates are enabled. Each new paid request still requires a fresh user approval.
- Vercel serves the fixture demo and Supabase-backed case API. Its production Passport adapter runs in a private named Sandbox without public ports; the authenticated hosted payment path has been verified, and every paid operation still needs its own fresh Passport approval.
- The current build is not multi-tenant production auth. See docs/SECURITY.md.

## Non-negotiable product rules

- A catalog listing is not proof that an endpoint works, is permitted, covers the right jurisdiction or is independent.
- Arbitrary merchants, invoice systems and APIs are not automatically compatible with Passport.
- Never invent a live payment, provider response, price, transaction hash, result, endorsement or integration.
- Modes fixture, test and live are separate and visible. The EasyPost test path and one Sirenic Passport live request have been verified; do not generalize those checks to other providers or requests.
- The LLM cannot authorize payment, choose an arbitrary URL, change policy, waive limits or approve a transfer.
- Always request a fresh separate Passport session and pass its approved `--session-id` explicitly. In a new environment, keep live execution disabled until this path has been verified there.
- A submitted command, HTTP 402 or API response is not settlement proof.
- Do not put passkeys, one-time codes, signed payment headers, provider secrets, SERV keys or full bank details in the browser, logs, source control or demo.
- Treat source responses and model output as untrusted. Enforce tenant scoping and origin checks server-side.
- Do not claim guaranteed fraud detection, verified identity, legal clearance, source correctness or model correctness. Claim payment settlement only when Passport activity and, where applicable, the chain receipt support it.

## Design source of truth

Follow FRONTEND_SPEC.md for visual tokens, copy, motion, responsive layout, app routes and accessibility. The product uses plain-text Veyra branding only. Do not add a logo, favicon or sponsor mark.

## Working rules

- British English in product copy. Avoid em dashes.
- Use only scenario-appropriate input fields.
- Keep unknown source, cost and payment values explicitly unknown.
- Do not expose local .env values or commit .env.
- Keep npm cache, temporary build files, SQLite data and Next.js output under S:\Hackathon\Veyra for local work.
- The source and service integration status is documented in docs/INTEGRATION_STATUS.md.
- The submission materials are drafts. Do not publish an X post or submit the form without a direct request.

## References

- https://www.openserv.ai/hackathon-2
- https://docs.openserv.ai/serv-reasoning/introduction.md
- https://docs.openserv.ai/serv-reasoning/tutorials/structured-outputs.md
- https://docs.gokite.ai/passport/payments
- https://docs.gokite.ai/passport/payments/allowance
- https://agentpassport.ai/explore
- https://github.com/BrKDDD/kite-x402-hono

Hackathon deadline in supplied planning documents: 15 November 2026, 23:59 UTC, or 16 November at 00:59 Lagos time.
