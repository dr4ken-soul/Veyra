# Veyra | Hackathon submission plan

Draft positioning only. Update it with verified outcomes before publication.

## Positioning

**Name:** Veyra  
**One-line pitch:** Buy the proof before you decide.  
**Track:** Kite, with SERV Reasoning.  
**Audience:** finance and procurement operators, ecommerce teams and developers integrating agent workflows.

## Current demonstration

The public Vercel app leads with a live, visitor-funded Sirenic x402 lookup for French company profiles. Each visitor connects their own injected Base wallet, reviews the exact quote, and approves a one-time payment capped at $0.005; Veyra never uses the operator's Passport funds for that route. The response is checked against Sirenic's published Ed25519 signing key. Other scenario cards remain clearly labelled synthetic examples. The authenticated Production workspace includes SERV planning, EasyPost test tracking, and a hosted Passport flow; each operator-paid query still requires fresh approval. The public route's first visitor-funded settlement and browser signature check need one live confirmation after deployment.

## Suggested demo narrative

1. Connect a visitor-owned Base wallet and request a French SIREN quote. Show the $0.005 cap and quote recipient before approving.
2. Show the paid response only after the browser verifies Sirenic's Ed25519 signature.
3. Explain that company registration cannot establish bank-account ownership; the invoice remains on hold.
4. Show shipment and registration as clearly labelled synthetic examples.
5. If real SERV/provider requests have been tested before recording, identify the actual model, request ID and provider mode. Never mix a live response with synthetic data without labelling each.

## Suggested short write-up

- Problem and user: evidence gaps in business workflows.
- Product: a case-to-evidence flow with a receipt and human review.
- SERV: describe the request and validation path that actually ran.
- Kite: describe the exact user-approved hosted session flow that actually ran; each new paid operation still requires a separate capped approval and an explicit approved session ID.
- Integration: name a provider only after an actual request, with operator, upstream source and limitations.
- Repository, demo or video, limitations and X post link.

## Submission checklist

- [ ] Public repository with accurate setup and security limits.
- [ ] Public fixture demo or video that labels all synthetic results.
- [ ] Short write-up matching only verified SERV and Kite behavior.
- [ ] One final X post with project name, concept, link and the OpenServ tag. Progress posts are optional.
- [ ] Submit the links through the [official form](https://openserv.typeform.com/submissions02) by 15 November 2026, 23:59 UTC (16 November 00:59 in Lagos).
- [ ] Do not claim sponsorship, verified bank ownership, fraud prevention, completed payment integration or live settlement without evidence.

## Single post draft

Veyra for @openservai Hackathon 02 (Kite): SERV plans checks; operators use Passport. Visitors pay Sirenic from their own Base wallet, max $0.005 per French lookup. Veyra checks the signed record; registries can't prove bank ownership. https://veyra-tau-mauve.vercel.app/demo

The X post and hackathon form are drafts only. They have not been published or submitted. Confirm one visitor-funded lookup after deployment before publishing the signature-verification claim. Edition 02 requires one final X post by the deadline; progress posts are optional.
