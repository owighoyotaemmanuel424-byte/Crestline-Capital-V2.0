# Funding API Contract

`convex/funding.createIntent` is the authenticated boundary for creating a Paystack funding transaction.

Inputs:
- `amount`: positive major-unit amount, maximum 1,000,000.
- `idempotencyKey`: 16-128 characters matching `[A-Za-z0-9._:-]`.

The mutation derives the account and currency from the authenticated user and returns a server-generated `reference`. The client must pass that reference to the Paystack initialization layer. The webhook then reconciles the reference and credits the matching account only after signature, event, amount, and currency validation.
