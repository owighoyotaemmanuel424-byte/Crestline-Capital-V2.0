# Funding Production Gate

Funding is production-ready only when all of the following are verified in the deployed environment:

- Authenticated users can create a server-owned funding intent.
- Paystack initialization uses the generated transaction reference and server-derived amount/currency.
- Paystack secret key is server-side only.
- The webhook endpoint receives the exact raw body and verifies `x-paystack-signature`.
- Duplicate provider events do not create duplicate ledger credits.
- Amount and currency mismatches are rejected.
- Unmatched references are quarantined as `UNMATCHED` rather than credited.
- A successful webhook creates exactly one `walletLedger` credit and moves the transaction to `SUCCESS`.
- Customer notification and audit records are created after successful posting.
- A test payment is reconciled end-to-end against the deployed production Convex database.
