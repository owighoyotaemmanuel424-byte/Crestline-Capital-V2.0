# Crestline Capital V2.0

A Next.js 14 TypeScript fintech foundation based on the supplied Crestline Capital blueprint. The architecture includes a PostgreSQL/Prisma double-entry ledger, Decimal.js precision, premium Sovereign Dark styling, transfer API foundation, and landing page.

## Stack
- Next.js 14 App Router
- TypeScript
- PostgreSQL + Prisma
- Decimal.js
- Tailwind CSS

## Setup
1. Copy `.env.example` to `.env.local` and configure your database.
2. `npm install`
3. `npx prisma generate`
4. `npx prisma migrate dev`
5. `npm run dev`

Never commit real credentials, service-role keys, private keys, or production secrets.