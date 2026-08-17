import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, reference, requireUser } from "./helpers";

function feeFor(amount: number) { return Math.min(1000, Math.max(50, amount * 0.01)); }

export const create = mutation({
  args: {
    amount: v.number(),
    pin: v.string(),
    idempotencyKey: v.string(),
    destination: v.object({ type: v.literal("bank"), accountName: v.string(), accountNumber: v.string(), bankCode: v.string() }),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");
    if (!user.pinHash || !(await bcrypt.compare(args.pin, user.pinHash))) throw new Error("INVALID_PIN");
    const existing = await ctx.db.query("withdrawalRequests").withIndex("by_idempotency", (q) => q.eq("userId", user._id).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) return existing;
    if (!Number.isFinite(args.amount) || args.amount <= 0 || args.amount > 1000000) throw new Error("INVALID_AMOUNT");
    const account = await getPrimaryAccount(ctx, user._id);
    const fee = feeFor(args.amount);
    const total = args.amount + fee;
    if (account.availableBalance < total) throw new Error("INSUFFICIENT_FUNDS");
    const now = Date.now();
    const ref = reference("WD");
    const requestId = await ctx.db.insert("withdrawalRequests", { userId: user._id, accountId: account._id, amount: args.amount, fee, total, destination: args.destination, status: "PENDING", reference: ref, idempotencyKey: args.idempotencyKey, createdAt: now, updatedAt: now });
    await ctx.db.patch(account._id, { availableBalance: account.availableBalance - total });
    const transactionId = await ctx.db.insert("transactions", { senderAccountId: account._id, receiverAccountId: undefined, type: "WITHDRAWAL", amount: args.amount, fee, currency: account.currency, status: "PENDING", description: "Withdrawal request", reference: ref, idempotencyKey: args.idempotencyKey, deliveryStatus: "PENDING", createdAt: now });
    await ctx.db.insert("walletLedger", { accountId: account._id, userId: user._id, transactionId, amount: total, currency: account.currency, direction: "DEBIT", type: "WITHDRAWAL", status: "HELD", reference: ref, createdAt: now });
    await ctx.db.insert("auditLogs", { actorId: user._id, action: "WITHDRAWAL_REQUESTED", targetId: requestId, reference: ref, metadata: { amount: args.amount, fee, destinationType: args.destination.type }, createdAt: now });
    return { requestId, transactionId, reference: ref, amount: args.amount, fee, total, status: "PENDING" };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db.query("withdrawalRequests").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(100);
  },
});
