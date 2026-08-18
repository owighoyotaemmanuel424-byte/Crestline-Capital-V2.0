# Convex production cutover

The production application uses Convex for new banking data and transfer operations.

Legacy Prisma runtime dependencies have been removed from the application build.
The remaining Mongo/Mongoose code is retained only for controlled legacy-data migration and legacy modules that are still being cut over.

Production verification sequence:

1. npm install --no-audit --no-fund
2. npx convex codegen
3. npx tsc --noEmit
4. npm run build
5. npx convex deploy
6. Vercel production deployment

Do not treat the migration as complete until all six stages succeed.
