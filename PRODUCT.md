# Veyra | Product

Status: hackathon build with fixture, EasyPost test/live shipment adapters, Sirenic company-record adapter, SERV planning and a Kite Passport worker. SERV, EasyPost test, and one Passport-approved Sirenic worker request have been verified locally; the full Veyra case UI/API live flow and hosted Vercel Passport path remain unverified. See [integration status](docs/INTEGRATION_STATUS.md).

## What Veyra does

Veyra helps a workflow identify missing evidence for a specific decision. A case has one narrow scenario, a validated evidence plan, a source-aware receipt and a human review. Shipment tracking can run through EasyPost in test or production mode. Company profiles can run through Sirenic after a fresh x402 quote and a task-specific Passport session.

The company record does not prove ownership of a bank account. Veyra does not approve or release invoices, transfer invoice funds or claim fraud prevention.

## Three scenarios

1. **Supplier change:** a Sirenic company profile identifies the legal entity. It cannot establish bank-account ownership or authority over payment details; a human keeps the invoice on hold.
2. **Shipment status:** an EasyPost tracker reports carrier status and timestamps. It does not prove package contents, condition or the intended recipient.
3. **Business registration:** a Sirenic profile for supported Great Britain or France identifiers reports registry-style company evidence. It is not identity verification, sanctions clearance or a guarantee of solvency.

## Modes

- **Fixture:** uses synthetic evidence and a simulated payment label. No external request or payment occurs.
- **Test:** currently supports EasyPost shipment tracking with an EasyPost test key. No Kite session is used.
- **Live:** uses EasyPost production for shipments, or Sirenic x402 through Kite Passport for company profiles. Live company mode remains disabled until credentials are present and the separate-session, explicit-session-ID flow is verified.

The UI labels each mode. Unknown settlement is not displayed as paid. EasyPost production account billing is shown separately from Passport payment.

## Kite Passport

Veyra requests a fresh separately approved spending session with a per-call and total cap matching Sirenic's preflight quote. The isolated worker checks the exact request/session pair immediately before execution, passes the approved session ID explicitly, and permits only fixed company-profile GET endpoints. Live company calls stay disabled until this path has been verified against a signed-in Passport account.

## Intended customers and revenue

The intended users are procurement, finance, ecommerce and agent-platform teams that need an evidence step inside existing software. Proposed subscription pricing is unvalidated. Veyra does not custody invoice funds or claim payment-fee revenue.
