# Financial Safety Gates

Do not declare the banking system production-ready until deployed tests verify:

1. Every debit has a matching ledger entry.
2. Every successful deposit has exactly one credit ledger entry.
3. Replayed provider events do not duplicate credits.
4. Idempotency-key reuse with a different amount is rejected.
5. Pending withdrawal holds are released exactly once on cancellation/rejection.
6. Frozen users cannot initiate new financial operations.
7. Admin-only operations reject ordinary users.
8. Paystack webhook signatures are verified against the raw body.
9. Provider amount and currency are reconciled before crediting.
10. Production Convex and Vercel environment configuration is verified independently of source-code review.
