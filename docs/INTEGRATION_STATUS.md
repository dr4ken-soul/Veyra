# Integration status

Last checked: 11 November 2026.

| Capability | Implemented | Verified here | User-facing state |
|---|---|---|---|
| SERV Reasoning | OpenAI-compatible structured-output adapter and local schema validation | No key or model supplied, so no network request or request ID exists | Simulated planner by default |
| Supplier evidence | Synthetic fixture contract and limitations | No source provider, terms, licence or account-ownership endpoint verified | Fixture only; review required |
| Shipment evidence | Synthetic fixture contract and limitations | No carrier, tracking API or adapter verified | Fixture only; review required |
| Company registration | Synthetic fixture contract and limitations | No registry endpoint or licence verified | Fixture only; insufficient evidence |
| Kite Passport session | Live session UI state and API failure path | No CLI installed or session request attempted; session-only execution and quote integrity not proven | Unavailable |
| x402 payment | No buyer execution adapter is enabled | No paid service, facilitator, asset, network or settlement verified | No real payment can be made |
| Webhooks | Not implemented | No endpoint, signature or retry path exists | Not available |
| Deployment | Local Next.js app | No host account or public HTTPS deployment configured | Run locally or record a video |

## SERV configuration

The code sends a request only when SERV_REASONING_API_KEY or SERV_API_KEY and SERV_MODEL are both configured. It uses the official base URL, does not follow redirects, requires a JSON-schema response, checks for refusals and truncation, validates the data locally, and stores only the returned request ID, model and plan. Provider failures return an error and do not start an evidence operation.

The key and model in the current .env are blank. A real SERV request has not been confirmed.

## Kite Passport gate

The official Passport documentation says an active approved session pays for a call, but an expired or absent session can fall back to an allowance. This project has not established a supported way to enforce and verify the requested session-specific path for each operation. Live execution remains disabled. Veyra does not invoke kpass or infer settlement from an API response.

## Next verification steps

1. Configure SERV credentials and a model confirmed for the account, then make a real schema-constrained request and record the request ID.
2. Inspect the precise catalog endpoint and source permissions before marking it supported.
3. Verify the installed Passport interface and prove session identity, task binding, expiry, no allowance fallback, destination and amount integrity, and one-attempt handling.
4. Only after the above, add a provider adapter and test it with a real user-approved session. Keep the fixture path separate.