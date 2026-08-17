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
    await ctx.runMutation(internal.paystack.recordWebhook, { eventId, eventType: event.event || "unknown", reference: event.data?.reference });
    return { received: true, eventId };
  },
});

export const recordWebhook = internalMutation({
  args: { eventId: v.string(), eventType: v.string(), reference: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("webhookEvents").withIndex("by_eventId", (q) => q.eq("eventId", args.eventId)).unique();
    if (existing) return { duplicate: true };
    await ctx.db.insert("webhookEvents", { eventId: args.eventId, eventType: args.eventType, status: "RECEIVED", reference: args.reference, createdAt: Date.now() });
    return { duplicate: false };
  },
});
