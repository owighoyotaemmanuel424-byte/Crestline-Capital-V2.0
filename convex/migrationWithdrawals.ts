import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const importBatch = mutation({
  args: { secret: v.string(), withdrawals: v.array(v.object({ id: v.string(), userId: v.string(), amount: v.number(), fee: v.number(), total: v.number(), accountName: v.string(), accountNumber: v.string(), bankCode: v.string(), status: v.string(), reference: v.string(), createdAt: v.number() })) },
  handler: async (ctx, { secret, withdrawals }) => {
    if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) throw new Error("FORBIDDEN");
    let imported = 0;
    for (const source of withdrawals) {
      if (await ctx.db.query("withdrawalRequests").withIndex("by_legacyId", q => q.eq("legacyId", source.id)).unique()) continue;
      const user = await ctx.db.query("users").withIndex("by_legacyId", q => q.eq("legacyId", source.userId)).unique();
      if (!user) continue;
      const account = await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", user._id)).first();
      if (!account) continue;
      await ctx.db.insert("withdrawalRequests", { legacyId: source.id, userId: user._id, accountId: account._id, amount: source.amount, fee: source.fee, total: source.total, destination: { type: "bank", accountName: source.accountName, accountNumber: source.accountNumber, bankCode: source.bankCode }, status: source.status.toUpperCase(), reference: source.reference, idempotencyKey: `legacy:${source.id}`, createdAt: source.createdAt, updatedAt: source.createdAt });
      imported++;
    }
    return { imported };
  },
});
