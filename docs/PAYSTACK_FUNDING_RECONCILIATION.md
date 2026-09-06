# Paystack Funding Reconciliation

Crestline Capital credits customer balances only from a verified `charge.success` webhook.

## Required transaction contract

Before redirecting a customer to Paystack, the application must create a pending `transactions` record with:

- `type`: `DEPOSIT` (or legacy-compatible `FUNDING`)
- `receiverAccountId`: customer's account
- `amount`: customer amount in the account currency's major unit
- `currency`: account currency
- `reference`: unique Paystack reference
- `status`: pending
- `idempotencyKey`: unique client/server request key

## Webhook rules

1. Verify `x-paystack-signature` against the exact raw request body using HMAC-SHA512.
2. Deduplicate by provider event ID.
3. Process only `charge.success` events whose provider status is `success`.
4. Match the event reference to the pending transaction.
5. Verify amount (`Paystack` minor units vs transaction major units) and currency.
6. Reject unmatched, malformed, or mismatched payments without crediting a balance.
7. Post exactly one credit ledger entry and update the transaction to `SUCCESS`.
8. Mark the webhook event `PROCESSED` only after the ledger credit succeeds.

No webhook path should trust a client-supplied amount or credit an account solely from an email, user ID, or frontend callback.
