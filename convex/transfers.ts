import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, reference, requireUser } from "./helpers";

const transferType = v.union(v.literal("internal"), v.literal("external"), v.literal("international"));

function feeFor(amount: number, type: string) {
  if (type === "internal") return 0;
  return Math.min(25, Math.max(2.5, amount * 0.005));
}

export const verifyRecipient = query({
  args: { accountNumber: v.string() },
  handler: async (ctx, { accountNumber }) => {
    await requireUser(ctx);
    const recipient = await ctx.db.query("users").withIndex("by_accountNumber", (q) => q.eq("accountNumber", accountNumber)).unique();
    if (!recipient || recipient.isFrozen) return null;
    return { name: recipient.name, accountNumber: recipient.accountNumber, isFrozen: recipient.isFrozen };
  },
});

export const create = mutation({
  args: {
    recipientAccountNumber: v.string(),
    amount: v.number(),
    type: transferType,
    description: v.optional(v.string()),
    pin: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const sender = await requireUser(ctx);
    if (sender.isFrozen) throw new Error("ACCOUNT_FROZEN");
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(args.idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
    if (!Number.isFinite(args.amount) || args.amount <= 0 || args.amount > 1000000) throw new Error("INVALID_AMOUNT");
    if (Math.round(args.amount * 100) !== args.amount * 100) throw new Error("AMOUNT_MUST_HAVE_AT_MOST_TWO_DECIMALS");
    if (args.description && args.description.length > 160) throw new Error("INVALID_DESCRIPTION");
    if (!/^\d{4,6}$/.test(args.pin)) throw new Error("INVALID_PIN");
    if (!sender.pinHash || !(await bcrypt.compare(args.pin, sender.pinHash))) throw new Error("INVALID_PIN");

    const senderAccount = await getPrimaryAccount(ctx, sender._id);
    const existingRequest = await ctx.db.query("transferRequests").withIndex("by_user_key", (q) => q.eq("userId", sender._id).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existingRequest?.response) return existingRequest.response;

    const recipient = await ctx.db.query("users").withIndex("by_accountNumber", (q) => q.eq("accountNumber", args.recipientAccountNumber)).unique();
    if (!recipient) throw new Error("RECIPIENT_NOT_FOUND");
    if (recipient.isFrozen) throw new Error("RECIPIENT_FROZEN");
    if (recipient._id.toString() === sender._id.toString()) throw new Error("SELF_TRANSFER");
    if (args.type !== "internal") throw new Error("EXTERNAL_TRANSFER_NOT_CONFIGURED");

    const receiverAccount = await getPrimaryAccount(ctx, recipient._id);
    if (senderAccount.currency !== receiverAccount.currency) throw new Error("CURRENCY_MISMATCH");
    const fee = Number(feeFor(args.amount, args.type).toFixed(2));
    const total = Number((args.amount + fee).toFixed(2));
    if (senderAccount.availableBalance < total) throw new Error("INSUFFICIENT_FUNDS");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const recent = await ctx.db.query("transactions").withIndex("by_sender", (q) => q.eq("senderAccountId", senderAccount._id)).order("desc").take(500);
    const dailyTotal = recent.filter((t) => t.status === "SUCCESS" && t.createdAt >= todayStart.getTime()).reduce((sum, t) => sum + t.amount, 0);
    if (dailyTotal + args.amount > 100000) throw new Error("DAILY_LIMIT_EXCEEDED");

    const now = Date.now();
    const ref = reference("CRL");
    const transactionId = await ctx.db.insert("transactions", {
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      type: args.type,
      amount: args.amount,
      fee,
      currency: senderAccount.currency,
      status: "SUCCESS",
      description: args.description || "Internal transfer",
      reference: ref,
      idempotencyKey: args.idempotencyKey,
      deliveryStatus: "COMPLETED",
      createdAt: now,
    });

    await ctx.db.insert("walletLedger", { accountId: senderAccount._id, userId: sender._id, transactionId, amount: total, currency: senderAccount.currency, direction: "DEBIT", type: "TRANSFER", status: "POSTED", reference: ref, createdAt: now });
    await ctx.db.insert("walletLedger", { accountId: receiverAccount._id, userId: recipient._id, transactionId, amount: args.amount, currency: receiverAccount.currency, direction: "CREDIT", type: "TRANSFER", status: "POSTED", reference: ref, createdAt: now });
    await ctx.db.patch(senderAccount._id, { availableBalance: Number((senderAccount.availableBalance - total).toFixed(2)) });
    await ctx.db.patch(receiverAccount._id, { availableBalance: Number((receiverAccount.availableBalance + args.amount).toFixed(2)) });

    const response = { transactionId, reference: ref, amount: args.amount, fee, total, currency: senderAccount.currency, status: "SUCCESS", deliveryStatus: "COMPLETED", createdAt: now };
    await ctx.db.insert("transferRequests", { userId: sender._id, idempotencyKey: args.idempotencyKey, transactionId, status: "SUCCESS", response, createdAt: now });
    await ctx.db.insert("auditLogs", { actorId: sender._id, action: "TRANSFER_COMPLETED", targetId: recipient._id, reference: ref, metadata: { amount: args.amount, fee, type: args.type, currency: senderAccount.currency }, createdAt: now });
    await ctx.db.insert("notifications", { userId: sender._id, type: "TRANSFER", title: "Transfer successful", body: `Your transfer of ${args.amount} ${senderAccount.currency} was completed.`, read: false, transactionId, createdAt: now });
    await ctx.db.insert("notifications", { userId: recipient._id, type: "TRANSFER", title: "Money received", body: `You received ${args.amount} ${receiverAccount.currency}.`, read: false, transactionId, createdAt: now });
    return response;
  },
});
