# Funding Implementation Status

Implemented on the production hardening branch:

- Server-owned, authenticated funding intent creation.
- Funding idempotency protection.
- Paystack HMAC-SHA512 signature verification.
- Provider event deduplication.
- Charge-success reconciliation.
- Amount/currency validation.
- Single ledger credit protection.
- Transaction status transition and customer notification.
- Audit trail.

Still required before declaring funding production-ready: wire the authenticated funding intent into the customer funding UI and Paystack initialization flow, configure Paystack in the deployed environment, and execute a real end-to-end test payment against the deployed Convex backend.
