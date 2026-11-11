# Veyra | Submission materials

## Verified project description

Veyra is an evidence procurement workflow for business decisions. A user submits one of three narrow scenarios, reviews a structured evidence plan, sees the source operator and limitations in a receipt, then records a human review. The supplier-change path explicitly keeps the invoice on hold because company registration does not establish bank-account ownership.

The current public demo is synthetic and labelled Simulated. The local workspace stores cases in SQLite and can use a configured SERV key for planning. No SERV request has been run in this environment, no evidence provider has been verified, and no Kite Passport session or payment has been made. The repository does not claim a live source or settlement.

## Short write-up draft

**Problem.** Business workflows often reach a decision with a specific evidence gap. Teams need to know what the source can establish, what it cannot establish, and whether a payment actually settled.

**Product.** Veyra models a case as a narrow question, an evidence plan, a source-aware receipt and a human review. It includes supplier-change, shipment-status and business-registration scenario packs. The supplier case cannot be cleared by a registry record alone, and Veyra never releases an invoice.

**SERV Reasoning.** The server has an OpenAI-compatible SERV adapter that requests a strict JSON schema for a bounded evidence plan, checks the returned structure locally, and records the real request identifier when SERV returns one. The submitted demo currently uses the local simulated planner because no SERV key or confirmed model is configured. Replace this sentence only after an actual SERV request succeeds.

**Kite Passport.** The app marks live payments unavailable. The documented allowance fallback means an expired or absent session can pay without another prompt, so this build does not execute any paid call until session binding, no-fallback behaviour, quote integrity and provider eligibility are proven. No transaction is shown.

**Evidence and limits.** The public walk-through uses synthetic fixtures. Each receipt labels the Veyra operator, synthetic upstream data, simulated payment state and scenario limitations. A synthetic result is not a real registry or carrier record.

**Repository.** https://github.com/dr4ken-soul/Veyra

## Demo video outline

1. Open the landing page and state the product boundary: buy evidence before deciding, and keep the final action with a person.
2. Open the public demo and select Supplier change.
3. Show the evidence plan, then the explicitly simulated result and receipt.
4. Explain that a registry record cannot establish who owns a bank account, and the invoice remains on hold.
5. Show the shipment and registration scenario labels and their respective limitations.
6. If showing the private workspace, create a synthetic case, request a simulated plan, run a fixture, export its JSON receipt and record a review.
7. State clearly that no provider call or payment occurred in this build.

Do not record the local access code, API key, full .env file, real customer records or an unverified SERV response. If a real SERV plan is configured before recording, show its returned request identifier and identify the actual model.

## X post draft

Veyra: buy the proof before you decide.

It turns a business evidence gap into a bounded case, a source-aware receipt and a human review. A company record cannot prove bank-account ownership, and an unclear result stays open.

This demo uses simulated evidence. No payment was made.

Add the public repository and demo link only after confirming both are accessible.

## Submission checklist

- [x] Local app, public illustrative demo and three scenario packs are implemented.
- [x] A real .env exists on the build machine and is excluded from Git.
- [ ] Run and capture a real SERV structured-output request with its request identifier.
- [ ] Verify an eligible evidence provider, its terms, endpoint, jurisdiction and payment compatibility.
- [ ] Prove session-only Kite execution with no allowance fallback, then confirm any transaction independently before claiming a payment.
- [ ] Publish the public repository and confirm the push.
- [ ] Deploy an HTTPS demo or record a demo video.
- [ ] Publish the X post and copy its URL into the submission form.
- [ ] Submit the write-up and links through the official hackathon form before the deadline.

The X post and hackathon submission are drafts only. They have not been published or submitted.