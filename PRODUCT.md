# Veyra | Product

Status: local hackathon application implemented in fixture mode. No live evidence source or payment capability is verified.

## What Veyra does

Veyra helps an existing workflow obtain evidence for a specific decision. A user creates a case, asks for a narrow evidence plan, reviews a synthetic or configured SERV plan, and sees a receipt with the source, operator, payment state and limitations. A human records the final review.

The local build uses a SQLite database and simulated evidence fixtures. A server-side SERV adapter is available when a user configures credentials and a confirmed model. The current local .env has no SERV credentials, so it uses the simulated planner.

## Three scenarios

1. **Supplier change:** a supplier requests changed payment details. A company record alone cannot establish bank-account ownership. The invoice remains on hold pending independent verification.
2. **Shipment status:** a synthetic carrier event can demonstrate the workflow. A carrier status does not prove package contents or condition.
3. **Business registration:** a synthetic registry-style record can demonstrate the workflow. It is not an official registry result, identity verification, sanctions clearance or guarantee of solvency.

## Modes

- **Fixture:** supported in this app. Uses synthetic evidence and simulated payment state. No real payment occurs.
- **Test:** disabled until the non-production provider, facilitator, asset, network and transaction path are verified.
- **Live:** disabled until an eligible provider and task-bound Passport session are verified, including no allowance fallback and quote integrity.

The UI labels the mode and never displays a simulated receipt as a payment receipt. Unknown settlement is not displayed as paid.

## Kite Passport

Kite Passport supports paid API flows under user-approved spending sessions. Its current documentation also describes allowance fallback when a session is absent or expired. The local build cannot prove that the integration is always session-bound, so no session is requested and no paid API call is attempted.

## Intended customers and revenue

The intended users are procurement, finance, ecommerce and agent-platform teams that need an evidence step inside existing software. Proposed subscription pricing in planning documents is unvalidated. Veyra does not custody invoice funds or claim payment-fee revenue in this build.