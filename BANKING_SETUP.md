# Crestline Capital Banking App

## Architecture

- Next.js 14 App Router + TypeScript frontend
- Zustand for session state
- Axios for API requests
- Vercel-native Next.js API routes under `/app/api/[...path]`
- Express + Mongoose banking API under `/backend` for local/standalone development
- MongoDB Atlas + Mongoose for application banking data
- JWT authentication
- Zod request validation
- bcrypt password/PIN hashing
- Same-origin `/api` requests in all environments
- MongoDB transactions for atomic sender/receiver balance updates
- Transfer idempotency records to prevent duplicate submissions
- Audit log records for authentication, transfers and admin account actions
- Node.js runtime explicitly set for MongoDB API routes

## Vercel + MongoDB Atlas

1. In MongoDB Atlas, create a dedicated application database user and rotate any credential that has ever been exposed.
2. Use a connection string with the database name, for example `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/crestline?retryWrites=true&w=majority`.
3. Configure Atlas Network Access for the Vercel deployment. For testing, a broad allow-list can be used temporarily; production should use the narrowest network controls available.
4. In Vercel Project Settings -> Environment Variables, add `MONGODB_URI` and a strong `JWT_SECRET` for Production, Preview and Development.
5. Do not create `NEXT_PUBLIC_MONGODB_URI`, and never commit a production connection string.
6. The frontend always calls `/api`; no `localhost:4000` or external API URL is required in Vercel.
7. Redeploy after changing environment variables.
8. Verify `GET /api/health` returns `{ "ok": true, "service": "crestline-api" }`.

## Run locally

1. Install dependencies: `npm install`
2. Create `backend/.env` from `backend/.env.example`.
3. Set `MONGODB_URI` and a strong `JWT_SECRET`.
4. Start the Express API when standalone API development is needed: `npm run api`.
5. Start the Next.js app: `npm run dev`.
6. The Next.js frontend uses its own `/api` routes locally as well, so no `NEXT_PUBLIC_API_URL` setting is required.

## Pages

- `/` landing page
- `/login` login
- `/register` registration
- `/dashboard` authenticated customer dashboard
- `/transfer` transfer workflow
- `/transactions` transaction history
- `/account` account information
- `/cards` virtual card UI
- `/admin` admin operations

## Transfer flow

Recipient account number -> same-origin API recipient lookup -> amount -> transfer type -> server fee calculation -> review modal -> PIN verification -> idempotency key -> server-side balance/limit checks -> MongoDB transaction -> atomic sender debit + receiver credit -> transaction reference + audit log.

The server is authoritative for fees and balance calculations. Transfers reject frozen accounts, self-transfers, invalid PINs and insufficient balances. Each transfer request must include a unique `Idempotency-Key`; retrying the same request key will not create a second debit.

The current application also applies a demo daily transfer limit of $100,000. This should be replaced by provider/KYC-tier limits in a regulated production deployment.

## Production readiness gate

This repository is hardened as an application prototype, but it is **not a regulated banking core and must not be used to hold or move real customer funds as-is**.

Before production financial use:

1. Connect a licensed/regulated banking or payment provider for custody, accounts and settlement.
2. Implement KYC/AML, sanctions screening and risk-based transaction monitoring.
3. Replace the simple JWT session with short-lived access tokens, refresh-token rotation, device/session revocation and MFA/step-up authentication for transfers.
4. Use a proper double-entry immutable ledger rather than treating the User balance field as the source of truth.
5. Add provider webhooks, settlement reconciliation, retry queues and dispute handling.
6. Put secrets in a managed secret store; never commit `.env` files or production credentials.
7. Enforce HTTPS, secure cookies where applicable, strict CORS/CSRF policy and production security headers.
8. Add comprehensive audit retention, alerting, backups, disaster recovery and tamper-evident logging.
9. Run dependency scanning, SAST/DAST, penetration testing and an independent security/compliance review.
10. Obtain all licenses, registrations and legal/compliance approvals required for the operating jurisdictions.
