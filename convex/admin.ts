import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./helpers";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").order("desc").take(500);
  },
});

export const setFrozen = mutation({
  args: { userId: v.id("users"), frozen: v.boolean() },
  handler: async (ctx, { userId, frozen }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(userId, { isFrozen: frozen });
    await ctx.db.insert("auditLogs", { actorId: admin._id, action: frozen ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN", targetId: userId, createdAt: Date.now() });
    return { ok: true };
  },
});

export const listPendingWithdrawals = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("withdrawalRequests").order("desc").take(500);
  },
});

export const rejectWithdrawal = mutation({
  args: { requestId: v.id("withdrawalRequests"), reason: v.string() },
  handler: async (ctx, { requestId, reason }) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("WITHDRAWAL_NOT_FOUND");
    if (request.status !== "PENDING") throw new Error("WITHDRAWAL_NOT_PENDING");
    if (!reason.trim() || reason.length > 500) throw new Error("INVALID_REJECTION_REASON");

    const transaction = await ctx.db.query("transactions").withIndex("by_reference", (q) => q.eq("reference", request.reference)).unique();
    if (!transaction || !transaction.senderAccountId) throw new Error("WITHDRAWAL_TRANSACTION_NOT_FOUND");
    const account = await ctx.db.get(transaction.senderAccountId);
    if (!account) throw new Error("ACCOUNT_NOT_FOUND");
    const ledger = await ctx.db.query("walletLedger").withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id)).unique();
    if (!ledger || ledger.status !== "HELD") throw new Error("WITHDRAWAL_LEDGER_STATE_INVALID");

    const now = Date.now();
    await ctx.db.patch(requestId, { status: "REJECTED", notes: reason.trim(), updatedAt: now });
    await ctx.db.patch(transaction._id, { status: "FAILED", deliveryStatus: "REJECTED" });
    await ctx.db.patch(ledger._id, { status: "RELEASED" });
    await ctx.db.patch(account._id, { availableBalance: account.availableBalance + request.total });
    await ctx.db.insert("auditLogs", { actorId: admin._id, action: "WITHDRAWAL_REJECTED", targetId: requestId, reference: request.reference, metadata: { amount: request.amount, fee: request.fee, reason: reason.trim() }, createdAt: now });
    await ctx.db.insert("notifications", { userId: request.userId, type: "WITHDRAWAL", title: "Withdrawal rejected", body: `Your withdrawal ${request.reference} was rejected. ${reason.trim()}`, read: false, transactionId: transaction._id, createdAt: now });
    return { ok: true, status: "REJECTED", restored: request.total };
  },
});

export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("auditLogs").order("desc").take(500);
  },
});
