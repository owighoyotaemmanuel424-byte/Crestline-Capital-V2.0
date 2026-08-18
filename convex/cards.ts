import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, requireUser } from "./helpers";

const status = v.union(v.literal("pending"), v.literal("active"), v.literal("frozen"), v.literal("revoked"));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const account = await getPrimaryAccount(ctx, user._id);
    const cards = await ctx.db.query("cards").withIndex("by_user", q => q.eq("userId", user._id)).order("desc").take(50);
    return { balance: account.availableBalance, currency: account.currency, cards };
  },
});

export const apply = mutation({
  args: { type: v.union(v.literal("virtual"), v.literal("physical")), brand: v.union(v.literal("visa"), v.literal("mastercard")) },
  handler: async (ctx, { type, brand }) => {
    const user = await requireUser(ctx);
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");
    const existing = await ctx.db.query("cards").withIndex("by_user", q => q.eq("userId", user._id)).take(50);
    if (existing.some(c => ["pending", "active", "frozen"].includes(c.status))) throw new Error("CARD_ALREADY_EXISTS");
    const now = Date.now();
    const last4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const id = await ctx.db.insert("cards", { userId: user._id, last4, brand, type, status: "pending", spendingLimit: 1000, createdAt: now });
    await ctx.db.insert("auditLogs", { actorId: user._id, action: "CARD_APPLICATION_SUBMITTED", targetId: id, metadata: { type, brand }, createdAt: now });
    return { id, status: "pending", brand, type, last4 };
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
    const cards = await ctx.db.query("cards").order("desc").take(1000);
    return Promise.all(cards.map(async card => { const customer = await ctx.db.get(card.userId); return { ...card, user: customer ? { name: customer.name, email: customer.email, accountNumber: customer.accountNumber } : null }; }));
  },
});

export const setStatus = mutation({
  args: { cardId: v.id("cards"), status, reason: v.optional(v.string()) },
  handler: async (ctx, { cardId, status, reason }) => {
    const admin = await requireUser(ctx);
    if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");
    const card = await ctx.db.get(cardId);
    if (!card) throw new Error("CARD_NOT_FOUND");
    await ctx.db.patch(cardId, { status, revokedAt: status === "revoked" ? Date.now() : card.revokedAt, issuedAt: status === "active" && !card.issuedAt ? Date.now() : card.issuedAt });
    await ctx.db.insert("auditLogs", { actorId: admin._id, action: `CARD_${status.toUpperCase()}`, targetId: cardId, metadata: { reason }, createdAt: Date.now() });
    return { ok: true };
  },
});
