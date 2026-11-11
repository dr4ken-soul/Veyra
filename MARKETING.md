# Veyra | Hackathon submission plan

Draft positioning only. Update it with verified outcomes before publication.

## Positioning

**Name:** Veyra  
**One-line pitch:** Buy the proof before you decide.  
**Track:** Kite, with SERV Reasoning.  
**Audience:** finance and procurement operators, ecommerce teams and developers integrating agent workflows.

## Current demonstration

The public Vercel app is a clearly labelled synthetic demo for supplier change, shipment status and business registration. The local project contains code for SERV planning, Sirenic company profiles, EasyPost shipment tracking and a Kite Passport worker. It has not made an authenticated SERV request, real EasyPost request, Passport session or paid call here. Passport execution remains gated until the separate-session and explicit-session-ID flow is tested.

## Suggested demo narrative

1. Show a supplier requesting a payment-detail change and the evidence gap.
2. Explain that company registration cannot establish bank-account ownership.
3. Show the simulated receipt and keep the invoice on hold.
4. Show shipment and registration as simulated scenario packs.
5. If real SERV/provider requests have been tested before recording, identify the actual model, request ID and provider mode. Never mix a live response with synthetic data without labelling each.

## Suggested short write-up

- Problem and user: evidence gaps in business workflows.
- Product: a case-to-evidence flow with a receipt and human review.
- SERV: describe the request and validation path that actually ran.
- Kite: describe the exact user-approved session flow that actually ran; until separate-session and explicit-session-ID behavior is verified, state live execution remains gated.
- Integration: name a provider only after an actual request, with operator, upstream source and limitations.
- Repository, demo or video, limitations and X post link.

## Submission checklist

- [ ] Public repository with accurate setup and security limits.
- [ ] Public fixture demo or video that labels all synthetic results.
- [ ] Short write-up matching only verified SERV and Kite behavior.
- [ ] X post with project name, concept, images/links and the OpenServ tag.
- [ ] Submit the links through the [official form](https://openserv.typeform.com/submissions02) by 15 November 2026, 23:59 UTC (16 November 00:59 in Lagos).
- [ ] Do not claim sponsorship, verified bank ownership, fraud prevention, completed payment integration or live settlement without evidence.

The X post and hackathon form are drafts only. They have not been published or submitted.
