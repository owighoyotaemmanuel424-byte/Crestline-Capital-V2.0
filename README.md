# Crestline Capital V2.0

Crestline Capital is a Next.js 14 TypeScript banking application with a Convex backend, secure account/ledger architecture, authentication, transfers, withdrawals, transaction history, and production-oriented financial controls.

> **Production status:** The application is being migrated from the legacy MongoDB/Express/Prisma/Supabase paths to Convex. The Convex data model and migration tooling are in the repository, but production cutover is **not complete** until the Convex deployment environment is configured and CI/build verification passes.

## Architecture

- **Frontend:** Next.js 14 App Router + React + TypeScript
- **Backend/database:** Convex
- **Authentication:** Better Auth + Convex integration
- **UI:** Tailwind CSS + existing Crestline components
- **Icons:** Lucide React
- **Financial precision:** Decimal.js where required by existing financial code
- **Payments:** Paystack integration with server-side signature verification and webhook idempotency
- **Deployment target:** Vercel for the Next.js application + Convex production deployment

## Core Banking Features

- Customer registration and authentication
- Customer accounts and balances
- Internal Crestline transfers
- External/bank transfer foundation
- International transfer foundation
- Recipient verification flow
- Transaction history
- Wallet/account ledger entries
- Withdrawals
- Admin authorization
- Audit logging
- Notifications where supported by the backend
- Paystack webhook processing
- Transfer idempotency protections

## Transfer Money

The production transfer flow is designed around server-authoritative financial operations:

1. Authenticate the customer.
2. Resolve the source account on the server.
3. Validate the recipient and transfer parameters.
4. Check account status, available balance, and limits.
5. Calculate applicable fees server-side.
6. Enforce an idempotency key/reference.
7. Create the transaction and immutable ledger entries.
8. Update account balances within the backend transaction boundary.
9. Record safe audit metadata.
10. Return the real transaction/reference to the client.

The client must never be trusted for balances, account ownership, fees, user IDs, or authorization decisions.

## Convex Migration

The repository contains Convex schema/functions and repeatable migration tooling for moving legacy banking data into Convex.

Migration utilities include:

```text
convex/migration.ts
convex/migrationTransactions.ts
convex/migrationWithdrawals.ts
scripts/migrate-mongo-to-convex.mjs
```

The migration preserves legacy IDs where applicable so records can be reconciled without intentionally deleting the source data.

### Required production migration environment

Before running the migration, configure:

```text
MONGODB_URI=<legacy MongoDB connection string>
NEXT_PUBLIC_CONVEX_URL=<Convex deployment URL>
MIGRATION_SECRET=<one-time migration secret>
```

Run:

```bash
npm install
npm run convex:codegen
npm run migrate:convex
```

Do not expose `MIGRATION_SECRET` to the browser or commit it to Git.

## Convex Development

Install dependencies:

```bash
npm install
```

Generate Convex client types:

```bash
npm run convex:codegen
```

Run the local development environment:

```bash
npm run convex:dev
```

Deploy the Convex backend to the configured deployment:

```bash
npm run convex:deploy
```

## Vercel + Convex Production Deployment

Vercel hosts the Next.js application. Convex hosts the production backend/database.

The GitHub Actions production workflow validates the application and deploys Convex from `main`.

### GitHub Actions secret

Configure this repository secret before the production workflow can deploy Convex:

```text
CONVEX_DEPLOY_KEY
```

The workflow expects the key to be supplied through GitHub Actions secrets and does not store it in the repository.

### Vercel environment variables

Configure the Convex production URL and all application/payment secrets in the Vercel project environment. At minimum, the application must have the production Convex URL expected by the frontend and the secrets required by the enabled authentication/payment integrations.

Never place server secrets in `NEXT_PUBLIC_*` variables.

## Verification

Run the same checks used by production CI:

```bash
npm install
npm run convex:codegen
npm run typecheck
npm run build
```

For a production Convex deployment:

```bash
CONVEX_DEPLOY_KEY=<configured-secret> npx convex deploy
```

A deployment is **not considered production-ready** if code generation, typechecking, the Next.js build, or the Convex deployment fails.

## CI/CD

The repository workflow performs:

- Dependency installation
- Convex code generation
- TypeScript typechecking
- Next.js production build
- Convex production deployment on `main`

If CI reports `No CONVEX_DEPLOYMENT set`, the Convex production environment has not been configured for that runner yet. Configure the production deployment/deploy key rather than bypassing the Convex validation step.

## Security Principles

- Server-side authorization for financial operations
- Server-authoritative balances
- Immutable transaction/ledger history
- Idempotent financial requests
- No client-controlled account ownership
- No client-controlled fee calculation
- Safe user-facing error messages
- Paystack webhook signature verification
- Webhook event idempotency
- Audit metadata without passwords, PINs, tokens, or unnecessary credentials
- Production secrets must remain outside source control

## Legacy Services

The repository may still contain legacy MongoDB/Express/Prisma/Supabase code while migration and cutover are in progress. Do not remove legacy production data or dependencies solely because Convex has been introduced. Remove legacy services only after data reconciliation, application cutover, production verification, and rollback planning are complete.

## Project Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run convex:dev
npm run convex:codegen
npm run convex:deploy
npm run migrate:convex
```

## Production Checklist

Before declaring Crestline Capital production-ready:

- [ ] Convex production deployment exists
- [ ] `CONVEX_DEPLOY_KEY` is configured in GitHub Actions
- [ ] Vercel production environment variables are configured
- [ ] Legacy data migration has completed and been reconciled
- [ ] Authentication works against production Convex
- [ ] Transfer flow succeeds end-to-end
- [ ] Duplicate transfer attempts are rejected/idempotent
- [ ] Ledger entries match balance changes
- [ ] Transaction history reflects completed transfers
- [ ] Withdrawal flows are verified
- [ ] Paystack webhook verification is enabled
- [ ] CI passes codegen, typecheck, and build
- [ ] Vercel production deployment succeeds
- [ ] Production URL and critical routes are externally verified
- [ ] No secrets are committed to Git

## License / Credentials

Do not commit real credentials, service-role keys, private keys, payment secrets, authentication secrets, database credentials, migration secrets, or production deploy keys.
