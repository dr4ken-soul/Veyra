# Veyra | Submission materials

These materials are drafts. Describe only the path that has actually run by the time you publish.

**Timing:** The [official OpenServ Hackathon Edition 01 page](https://www.openserv.ai/hackathon) lists submissions for 14–28 September 2026. That window has passed as of 12 November 2026; check for a new edition before submitting these materials.

## Project description

Veyra is an evidence procurement workflow for business decisions. A user submits one of three bounded scenarios, reviews a structured evidence plan, receives a source-aware receipt and records a human review. The supplier-change path keeps the invoice on hold because a company record does not establish bank-account ownership.

The repository includes SERV structured-output planning, Sirenic x402 company-profile routes, EasyPost shipment tracking in test and production modes, an isolated Kite Passport CLI worker, and a Supabase Postgres case store with server-role-only access. A live SERV structured-output request and an EasyPost test-mode USPS tracker both completed through Veyra locally. The hosted Vercel case API now uses the dedicated Supabase project; production create, idempotent replay, fetch, and list succeeded in fixture mode. The public demo remains synthetic. The Passport worker is still local. The Sirenic paid call and Passport session flow remain unverified; live Passport mode stays gated.

## Short write-up draft

**Problem.** Business workflows often reach a decision with a specific evidence gap. Teams need to know what the source can establish, what it cannot establish, and whether a payment actually settled.

**Product.** Veyra turns a case into a narrow evidence question, a validated plan, a source-aware receipt and a human review. It includes supplier-change, shipment-status and business-registration scenarios. A registry record cannot establish bank-account ownership, and Veyra never releases an invoice.

**SERV Reasoning.** The server requests a strict JSON-schema plan and validates it locally before saving it. A real authenticated `gpt-6-luna` structured-output request and the full local plan flow succeeded.

**Kite Passport.** A separate worker requests a fresh session and passes its ID explicitly to the paid request, restricted locally to fixed Sirenic company-profile endpoints. The local account is signed in and the Veyra buyer agent is registered; separate-session approval and paid execution are still pending. No transaction is claimed.

**Evidence.** Sirenic is wired for company profiles in Great Britain and France, but its paid result is unverified. EasyPost returned a test-mode USPS fixture with status `delivered`; this is synthetic carrier test data, not a live shipment. Public demo receipts are synthetic and explicitly labelled Simulated.

**Limits.** Company registration is not bank-account ownership, and carrier status does not establish package contents or condition. Unknown payment settlement remains unknown. A person makes the final decision.

**Repository.** [github.com/dr4ken-soul/Veyra](https://github.com/dr4ken-soul/Veyra)

**Demo.** [Veyra synthetic demo on Vercel](https://veyra-tau-mauve.vercel.app/demo). The route is public and returns HTTP 200; its page labels all data and actions as simulated.

## Demo outline

1. Open the public simulated demo and state the boundary: Veyra buys evidence before a decision; a person makes the final decision.
2. Show a supplier-change evidence gap and the synthetic plan and receipt.
3. Explain that a registry record cannot establish who owns a bank account, and the invoice remains on hold.
4. Show shipment and registration as simulated scenarios.
5. If an authenticated SERV plan succeeds before recording, state the real model and request ID. If a provider query succeeds, identify the provider and mode shown on its receipt.
6. Do not present code, a quote, an approval link or an HTTP response as a completed payment.

Do not record the local access password, API key, `.env`, real customer records, passkeys or unverified payment activity.

## X post draft

Veyra: buy the proof before you decide.

It turns a business evidence gap into a bounded case, a source-aware receipt and a human review. A company record cannot prove bank-account ownership, and an unclear result stays open.

This demo uses simulated evidence. No payment was made.

Repository: https://github.com/dr4ken-soul/Veyra

Demo: https://veyra-tau-mauve.vercel.app/demo

This post has not been published.

## Submission checklist

- [x] Local app, three scenario packs, integration adapters and a simulated demo are implemented.
- [x] Real local `.env` exists and is excluded from Git.
- [x] Run and capture a real SERV structured-output request with its request identifier.
- [x] Verify a real EasyPost test tracker in test mode.
- [x] Create the separate Veyra Supabase project and apply its RLS-protected schema; deploy the case-store adapter.
- [x] Add `SUPABASE_SECRET_KEY` to local `.env` and Vercel and verify hosted case persistence in fixture mode.
- [ ] Verify the exact Sirenic response and provenance.
- [ ] Verify separate-session approval, explicit session-ID execution and rejection of a mismatched or expired session; verify settlement independently before claiming a payment.
- [x] Confirm public GitHub repository and Vercel fixture demo URLs.
- [ ] Publish an accurate X post and copy its URL into the submission form.
- [ ] Submit the write-up and links through the [official hackathon form](https://openserv.typeform.com/submissions02) if a current submission window is open.

The X post and hackathon form have not been published or submitted.
