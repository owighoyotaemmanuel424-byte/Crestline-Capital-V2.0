# MongoDB → Convex Cutover Runbook

## Scope
The Crestline application runtime is now Convex + Better Auth. MongoDB is retained only as a one-time migration source until reconciliation is complete.

Convex recommends testing backend changes on a non-production deployment before production deployment and supports preview/development deployments for this workflow.

## 1. Prepare

1. Take a verified MongoDB backup.
2. Create/select a Convex development or staging deployment.
3. Set `MONGODB_URI`, `NEXT_PUBLIC_CONVEX_URL`, and `MIGRATION_SECRET` only in the migration environment.
4. Set the same `MIGRATION_SECRET` in the target Convex deployment.
5. Confirm the Convex schema has been deployed.

## 2. Run migration

```bash
npm install
npx convex codegen
npm run migrate:convex
```

The importer is idempotent by legacy IDs. Users are imported with `legacy:<mongo-id>` authentication markers so a subsequent Better Auth registration can link the legacy profile by email.

## 3. Reconcile before cutover

Verify:

- Mongo user count == Convex migrated user count.
- Every migrated user has exactly one PRIMARY USD account.
- Mongo account balances match Convex account balances to cents.
- Mongo transaction count == Convex transaction count for imported records.
- Successful transactions have the expected debit/credit ledger entries.
- Failed/pending transactions are not posted as settled ledger entries.
- Withdrawal counts and statuses match.
- No duplicate `legacyId`, reference, or migration event exists.

Do not delete the Mongo source until these checks are signed off.

## 4. Authentication cutover

Legacy passwords are not copied into Better Auth by the migration script. Existing customers must authenticate through Better Auth and their profile can be linked by email when `users.ensureProfile` sees a `legacy:<id>` record. Plan a controlled password-reset/onboarding communication for migrated customers.

## 5. Production deploy

Use a scoped `CONVEX_DEPLOY_KEY` in CI and run:

```bash
npx convex deploy
```

Configure the frontend with the production `NEXT_PUBLIC_CONVEX_URL` and the Convex deployment with the required server secrets.

## 6. Decommission

Only after reconciliation and successful production smoke tests:

1. Disable MongoDB application credentials.
2. Remove migration-only secrets from normal runtime environments.
3. Remove the migration script/model dependencies in a later cleanup PR.
4. Retain the backup according to the project's data-retention policy.

## Production rule

No production customer money movement should be enabled merely because the schema deployed. Funding, webhook settlement, withdrawals, refunds, and reconciliation must each be tested end-to-end against the Convex ledger first.
