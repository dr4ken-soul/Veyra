# Veyra — Edition 02 demo film
## Voice-over master

One disputed invoice can begin with a simple question: is this the right company?

Veyra turns that question into an evidence case. It keeps the request, source, timestamp and confidence together, so a reviewer can see what is known, what remains uncertain, and why.

The live demonstration is a French company lookup. A visitor enters SIREN 632012100 and sees a quote before paying: zero point zero zero five USDC on Base. The visitor approves the exact amount from their own wallet. Veyra never receives the wallet key.

Sirenic returns the company profile for L’Oréal, with active registry status. Veyra verifies the provider’s Ed25519 response signature in the browser, and links the result to the public verification receipt.

Payment is a separate fact. Base confirms the transaction succeeded in block 57,501,654: precisely 0.005 USDC to the quoted recipient.

The signature proves the response came from the provider. The Base receipt proves that payment settled. Neither proves bank account ownership, payment instructions, sanctions status, or solvency. A person still makes the decision.

Other scenarios are clearly marked synthetic; shipment data is test mode.

Veyra. Evidence for decisions. Human judgement stays in control.
