import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getPrimaryAccount, reference, requireUser } from "./helpers";

const keyPattern = /^[A-Za-z0-9._:-]{16,128}$/;

export const createIntent = mutation({
  args: { amount: v.number(), idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");
    if (!keyPattern.test(args.idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
    if (!Number.isFinite(args.amount) || args.amount <= 0 || args.amount > 1000000) throw new Error("INVALID_AMOUNT");

    const existing = await ctx.db.query("transactions").withIndex("by_idempotency", (q) => q.eq("senderAccountId", undefined).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) {
      if (existing.receiverAccountId === undefined) throw new Error("FUNDING_INTENT_INVALID");
      if (existing.amount !== args.amount) throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_AMOUNT");
      return { transactionId: existing._id, reference: existing.reference, amount: existing.amount, currency: existing.currency, status: existing.status };
    }

    const account = await getPrimaryAccount(ctx, user._id);
    const now = Date.now();
    const ref = reference("DEP");
    const transactionId = await ctx.db.insert("transactions", {
      receiverAccountId: account._id,
      type: "DEPOSIT",
      amount: args.amount,
      fee: 0,
      currency: account.currency,
      status: "PENDING",
      description: "Paystack funding",
      reference: ref,
      idempotencyKey: args.idempotencyKey,
      deliveryStatus: "PENDING",
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", { actorId: user._id, action: "DEPOSIT_INTENT_CREATED", targetId: transactionId, reference: ref, metadata: { amount: args.amount, currency: account.currency }, createdAt: now });
    return { transactionId, reference: ref, amount: args.amount, currency: account.currency, status: "PENDING" };
  },
});
