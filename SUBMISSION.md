# Veyra | Submission materials

These materials are drafts. Describe only the path that has actually run by the time you publish.

**Target:** SERV Hackathon Edition 02, Kite track. The [official Edition 02 page](https://www.openserv.ai/hackathon-2) says every track must use SERV Reasoning and submissions close 15 November 2026 at 23:59 UTC (16 November at 00:59 in Lagos). The page requests a public repository, a demo link or video, a short write-up and an X post link.

## Project description

Veyra is an evidence procurement workflow for business decisions. A user submits one of three bounded scenarios, reviews a structured evidence plan, receives a source-aware receipt and records a human review. The supplier-change path keeps the invoice on hold because a company record does not establish bank-account ownership.

The repository includes SERV structured-output planning, Sirenic x402 company-profile routes, EasyPost shipment tracking in test and production modes, an isolated Kite Passport CLI worker, and a Supabase Postgres case store with server-role-only access. A live SERV structured-output request and an EasyPost test-mode USPS tracker both completed locally. One $0.005 Sirenic company-profile request completed through the local Passport worker after approval of a separate one-call session; a mismatched session ID was rejected before a request, and Kite activity plus a Base receipt confirmed settlement. Production Vercel now uses the dedicated Supabase project and a private named Sandbox with a signed-in Kite CLI and registered Veyra buyer identity. A hosted live case completed SERV planning, task-specific Passport approval, an explicit-session Sirenic GET, and receipt persistence; the authenticated case page returned HTTP 200 with the live evidence receipt and review state. Passport activity and a Base Mainnet receipt confirmed the hosted $0.005 USDC settlement (successful receipt, 5,000 USDC base units). The public demo remains synthetic.

## Short write-up draft

**Problem.** Business workflows often reach a decision with a specific evidence gap. Teams need to know what the source can establish, what it cannot establish, and whether a payment actually settled.

**Product.** Veyra turns a case into a narrow evidence question, a validated plan, a source-aware receipt and a human review. It includes supplier-change, shipment-status and business-registration scenarios. A registry record cannot establish bank-account ownership, and Veyra never releases an invoice.

**SERV Reasoning.** The server requests a strict JSON-schema plan and validates it locally before saving it. A real authenticated `gpt-6-luna` structured-output request and the full local plan flow succeeded.

**Kite Passport.** The private Vercel Sandbox worker is signed into Passport as the Veyra buyer agent. It requests a fresh, quote-capped session for each task, waits for passkey approval, verifies the exact active request/session pair, and passes the approved session ID explicitly to the fixed Sirenic company-profile endpoint. A hosted Production case completed a live French registry lookup and returned a source-aware receipt. Passport activity and a successful Base Mainnet receipt confirmed the $0.005 USDC settlement. A mismatched session ID was rejected before a provider request. Every future paid operation still requires its own approval.

**Evidence.** One local and one hosted Sirenic check each retrieved a French company profile and confirmed a $0.005 Base USDC settlement. The hosted transaction receipt had status `0x1` and one 5,000-unit USDC transfer. These checks verify only the tested responses and payment paths, not every company or future request. EasyPost returned a test-mode USPS fixture with status `delivered`; this is synthetic carrier test data, not a live shipment. Public demo receipts are synthetic and explicitly labelled Simulated.

**Limits.** Company registration is not bank-account ownership, and carrier status does not establish package contents or condition. Unknown payment settlement remains unknown. A person makes the final decision.

**Repository.** [github.com/dr4ken-soul/Veyra](https://github.com/dr4ken-soul/Veyra)

**Demo.** [Veyra synthetic demo on Vercel](https://veyra-tau-mauve.vercel.app/demo). The route is public and returns HTTP 200; its page labels all data and actions as simulated.

## Demo outline

1. Open the public simulated demo and state the boundary: Veyra buys evidence before a decision; a person makes the final decision.
2. Show a supplier-change evidence gap and the synthetic plan and receipt.
3. Explain that a registry record cannot establish who owns a bank account, and the invoice remains on hold.
4. Show shipment and registration as simulated scenarios.
5. If an authenticated SERV plan succeeds before recording, state the real model and request ID. If a provider query succeeds, identify the provider and mode shown on its receipt.
6. Do not present code, a quote, an approval link or an HTTP response alone as a completed payment. The public demo is simulated; separate local and hosted Passport checks have independently confirmed receipts. A person still reviews the result.

Do not record the local access password, API key, `.env`, real customer records, passkeys or unverified payment activity.

## X post draft

Veyra: buy the proof before you decide.

It turns a business evidence gap into a bounded case, a source-aware receipt and a human review. A company record cannot prove bank-account ownership, and an unclear result stays open.

The public demo uses simulated evidence and makes no external call or payment. Separate local and hosted Veyra flows completed one capped Sirenic request each through Kite Passport, with confirmed Base receipts.

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
- [x] Verify one Sirenic response matched the requested company identifier and included provider provenance.
- [x] Verify one separate-session approval, explicit session-ID execution, rejection of a mismatched session ID, Passport activity, and settlement in a Base receipt.
- [x] Configure and authenticate the named Vercel Passport sandbox; exercise the hosted Veyra case UI/API flow through SERV planning, fresh approval, explicit-session execution and confirmed receipt.
- [x] Confirm public GitHub repository and Vercel fixture demo URLs.
- [ ] Publish an accurate X post and copy its URL into the submission form.
- [ ] Submit the write-up and links through the [official Edition 02 hackathon form](https://openserv.typeform.com/submissions02) by 15 November 2026, 23:59 UTC.

The X post and hackathon form have not been published or submitted. Edition 02 is live; publish the prepared post and submit the public repository, demo and write-up before its deadline.
