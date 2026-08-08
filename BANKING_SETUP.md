# Crestline Capital Banking App

## Architecture

- Next.js 14 App Router + TypeScript frontend
- Zustand for session state
- Axios for API requests
- Express + Mongoose banking API under `/backend`
- MongoDB for application banking data
- JWT authentication
- Zod request validation
- bcrypt password/PIN hashing
- Global and transfer-specific rate limiting
- MongoDB transactions for atomic sender/receiver balance updates
- Transfer idempotency records to prevent duplicate submissions
- Audit log records for authentication, transfers and admin account actions
- Security response headers

## Run locally

1. Install dependencies: `npm install`
2. Create `backend/.env` from `backend/.env.example`.
3. Set `MONGODB_URI` and a strong `JWT_SECRET`.
4. Start API: `npm run api`
5. Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` for the Next.js app.
6. Start frontend: `npm run dev`

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

Recipient account number -> backend recipient lookup -> amount -> transfer type -> server fee calculation -> review modal -> PIN verification -> idempotency key -> server-side balance/limit checks -> MongoDB transaction -> atomic sender debit + receiver credit -> transaction reference + audit log.

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
