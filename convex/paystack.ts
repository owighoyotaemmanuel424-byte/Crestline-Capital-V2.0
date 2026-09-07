"use node";

import crypto from "node:crypto";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const processWebhook = internalAction({
  args: { rawBody: v.string(), signature: v.string() },
  handler: async (ctx, { rawBody, signature }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY_NOT_CONFIGURED");
    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    const provided = signature.toLowerCase();
    if (!/^[a-f0-9]{128}$/.test(provided) || !crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))) throw new Error("INVALID_WEBHOOK_SIGNATURE");
    const event = JSON.parse(rawBody) as { event?: string; data?: { id?: string; reference?: string; amount?: number; status?: string; currency?: string } };
    const eventId = `paystack:${event.event || "unknown"}:${event.data?.id || crypto.createHash("sha256").update(rawBody).digest("hex")}`;
    return await ctx.runMutation(internal.paystack.recordWebhook, {
      eventId,
      eventType: event.event || "unknown",
      reference: event.data?.reference,
      providerId: event.data?.id,
      amount: event.data?.amount,
      currency: event.data?.currency,
      providerStatus: event.data?.status,
    });
  },
});

export const recordWebhook = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    reference: v.optional(v.string()),
    providerId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("webhookEvents").withIndex("by_eventId", (q) => q.eq("eventId", args.eventId)).unique();
    if (existing) return { duplicate: true, eventId: args.eventId };

    const now = Date.now();
    const eventDoc = await ctx.db.insert("webhookEvents", { eventId: args.eventId, eventType: args.eventType, status: "RECEIVED", reference: args.reference, createdAt: now });

    if (args.eventType === "charge.success" && args.reference && args.providerStatus === "success") {
      const transaction = await ctx.db.query("transactions").withIndex("by_reference", (q) => q.eq("reference", args.reference!)).unique();
      if (!transaction) {
        await ctx.db.patch(eventDoc, { status: "UNMATCHED" });
        return { duplicate: false, eventId: args.eventId, status: "UNMATCHED" };
      }
      if (transaction.status === "SUCCESS") {
        await ctx.db.patch(eventDoc, { status: "PROCESSED", processedAt: now });
        return { duplicate: false, eventId: args.eventId, status: "ALREADY_PROCESSED" };
      }
      if (transaction.type !== "DEPOSIT" && transaction.type !== "FUNDING") {
        await ctx.db.patch(eventDoc, { status: "REJECTED" });
        return { duplicate: false, eventId: args.eventId, status: "INVALID_TRANSACTION_TYPE" };
      }
      if (!transaction.receiverAccountId) {
        await ctx.db.patch(eventDoc, { status: "REJECTED" });
        return { duplicate: false, eventId: args.eventId, status: "ACCOUNT_NOT_ATTACHED" };
      }
      if (args.amount !== undefined && args.amount !== transaction.amount * 100) {
        await ctx.db.patch(eventDoc, { status: "REJECTED" });
        return { duplicate: false, eventId: args.eventId, status: "AMOUNT_MISMATCH" };
      }
      if (args.currency && args.currency !== transaction.currency) {
        await ctx.db.patch(eventDoc, { status: "REJECTED" });
        return { duplicate: false, eventId: args.eventId, status: "CURRENCY_MISMATCH" };
      }

      const ledger = await ctx.db.query("walletLedger").withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id)).unique();
      const account = await ctx.db.get(transaction.receiverAccountId);
      if (!account) {
        await ctx.db.patch(eventDoc, { status: "REJECTED" });
        return { duplicate: false, eventId: args.eventId, status: "ACCOUNT_NOT_FOUND" };
      }
      if (ledger) {
        await ctx.db.patch(eventDoc, { status: "PROCESSED", processedAt: now });
        return { duplicate: false, eventId: args.eventId, status: "ALREADY_LEDGERED" };
      }

      await ctx.db.patch(transaction._id, { status: "SUCCESS", deliveryStatus: "DELIVERED" });
      await ctx.db.patch(account._id, { availableBalance: account.availableBalance + transaction.amount });
      await ctx.db.insert("walletLedger", { accountId: account._id, userId: account.userId, transactionId: transaction._id, amount: transaction.amount, currency: transaction.currency, direction: "CREDIT", type: "DEPOSIT", status: "POSTED", reference: transaction.reference, eventId: args.eventId, createdAt: now });
      await ctx.db.insert("notifications", { userId: account.userId, type: "TRANSACTION", title: "Deposit received", body: `Your deposit ${transaction.reference} has been credited.`, read: false, transactionId: transaction._id, createdAt: now });
      await ctx.db.patch(eventDoc, { status: "PROCESSED", processedAt: now });
      return { duplicate: false, eventId: args.eventId, status: "PROCESSED" };
    }

    await ctx.db.patch(eventDoc, { status: "IGNORED", processedAt: now });
    return { duplicate: false, eventId: args.eventId, status: "IGNORED" };
  },
});
