# Veyra | Submission materials

These materials are drafts. Describe only the path that has actually run by the time you publish.

## Project description

Veyra is an evidence procurement workflow for business decisions. A user submits one of three bounded scenarios, reviews a structured evidence plan, receives a source-aware receipt and records a human review. The supplier-change path keeps the invoice on hold because a company record does not establish bank-account ownership.

The repository includes SERV structured-output planning, Sirenic x402 company-profile routes, EasyPost shipment tracking in test and production modes, and an isolated Kite Passport CLI worker. These adapters are implemented but have not completed an authenticated provider call or payment in this workspace. The deployed Vercel app is a fixture demo. The local `.env` contains generated app and worker secrets, but SERV and EasyPost credentials are blank; Passport live mode remains gated.

## Short write-up draft

**Problem.** Business workflows often reach a decision with a specific evidence gap. Teams need to know what the source can establish, what it cannot establish, and whether a payment actually settled.

**Product.** Veyra turns a case into a narrow evidence question, a validated plan, a source-aware receipt and a human review. It includes supplier-change, shipment-status and business-registration scenarios. A registry record cannot establish bank-account ownership, and Veyra never releases an invoice.

**SERV Reasoning.** The server requests a strict JSON-schema plan and validates it locally before a provider call. The live code is present, but this environment has not sent an authenticated SERV request. Insert the actual model and SERV request ID after the request succeeds.

**Kite Passport.** A separate worker requests a fresh approved session and passes its ID explicitly to the paid request, restricted locally to fixed Sirenic company-profile endpoints. The account is not signed in here, and the live session flow has not been tested. No transaction is claimed.

**Evidence.** Sirenic is wired for company profiles in Great Britain and France; EasyPost is wired for shipment tracking. No authenticated provider result has been returned here. Public demo receipts are synthetic and explicitly labelled Simulated.

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
- [ ] Run and capture a real SERV structured-output request with its request identifier.
- [ ] Verify a real EasyPost test tracker and exact Sirenic response/provenance.
- [ ] Verify separate-session approval, explicit session-ID execution and rejection of a mismatched or expired session; verify settlement independently before claiming a payment.
- [x] Confirm public GitHub repository and Vercel fixture demo URLs.
- [ ] Publish an accurate X post and copy its URL into the submission form.
- [ ] Submit the write-up and links through the [official hackathon form](https://openserv.typeform.com/submissions02) before the stated deadline.

The X post and hackathon form have not been published or submitted.
