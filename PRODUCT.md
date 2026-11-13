# Veyra | Product

Status: hackathon build with fixture, EasyPost test/live shipment adapters, Sirenic company-record adapter, SERV planning and a Kite Passport worker. A hosted Vercel case completed SERV planning, a fresh Passport session approval, Sirenic retrieval and confirmed $0.005 Base settlement. The public `/demo` route now supports visitor-funded live French Sirenic profiles: each visitor uses their own Base wallet and explicitly approves an exact x402 payment capped at $0.005. The operator's Passport balance is never used for visitor lookups. The first public paid lookup still needs confirmation after deployment. See [integration status](docs/INTEGRATION_STATUS.md).

## What Veyra does

Veyra helps a workflow identify missing evidence for a specific decision. A case has one narrow scenario, a validated evidence plan, a source-aware receipt and a human review. Shipment tracking can run through EasyPost in test or production mode. Company profiles can run through Sirenic after a fresh x402 quote and a task-specific Passport session.

The company record does not prove ownership of a bank account. Veyra does not approve or release invoices, transfer invoice funds or claim fraud prevention. The visitor wallet path pays Sirenic directly; it does not send SERV requests, so Veyra does not expose or spend the operator's SERV API balance for anonymous visitors.

## Three scenarios

1. **Supplier change:** a Sirenic company profile identifies the legal entity. It cannot establish bank-account ownership or authority over payment details; a human keeps the invoice on hold.
2. **Shipment status:** an EasyPost tracker reports carrier status and timestamps. It does not prove package contents, condition or the intended recipient.
3. **Business registration:** the public visitor-paid flow currently supports French SIREN profiles only. The private operator flow supports the validated Sirenic profile paths documented in the code. A profile is not identity verification, sanctions clearance or a guarantee of solvency.

## Modes

- **Fixture:** uses synthetic evidence and a simulated payment label. No external request or payment occurs.
- **Test:** currently supports EasyPost shipment tracking with an EasyPost test key. No Kite session is used.
- **Live:** uses EasyPost production for shipments. The authenticated operator workspace uses Sirenic x402 through a fresh, separately approved Kite Passport session. On the public Production demo, a visitor's own injected Base wallet signs a one-time x402 payment directly to Sirenic, capped at $0.005 for a French company profile. The browser verifies the provider's Ed25519 response signature before showing evidence. Vercel Preview disables both live payment paths.

The UI labels each mode. Unknown settlement is not displayed as paid. EasyPost production account billing is shown separately from Passport payment.

## Kite Passport

The private operator flow requests a fresh separately approved spending session with a per-call and total cap matching Sirenic's preflight quote. The isolated worker checks the exact request/session pair immediately before execution, passes the approved session ID explicitly, and permits only fixed company-profile GET endpoints. Public visitors do not share this account: they use their own Base wallet for direct x402 payment, so no shared allowance or owner approval is needed for their requests.

## Intended customers and revenue

The intended users are procurement, finance, ecommerce and agent-platform teams that need an evidence step inside existing software. Proposed subscription pricing is unvalidated. Veyra does not custody invoice funds or claim payment-fee revenue.
