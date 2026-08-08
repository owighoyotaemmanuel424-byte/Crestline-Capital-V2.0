# Crestline Capital Banking App

## Architecture

- Next.js 14 App Router + TypeScript frontend
- Zustand for session state
- Axios for API requests
- Express + Mongoose banking API under `/backend`
- MongoDB as the transfer ledger database
- JWT authentication
- Zod request validation
- bcrypt password/PIN hashing
- Express rate limiting
- MongoDB transactions for atomic sender/receiver balance updates

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

Recipient account number -> backend recipient lookup -> amount -> transfer type -> fee calculation -> review modal -> PIN verification -> MongoDB transaction -> atomic sender debit + receiver credit -> transaction reference.

The transfer endpoint rejects frozen accounts, self-transfers, invalid PINs and insufficient balances. The server is authoritative for fees and balance calculations; the browser values are presentation only.

## Production checklist

Before handling real money, connect a regulated banking/payment provider and implement KYC/AML, MFA, transaction limits, audit logging, secrets management, HTTPS, CSRF protection where applicable, device/session controls, idempotency keys, webhook reconciliation, immutable ledgering and independent security/compliance review. This repository's transfer API is a functional application/demo implementation, not a regulated banking core.
