import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, requireUser } from "./helpers";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const account = await getPrimaryAccount(ctx, user._id);
    const cards = await ctx.db.query("cards").withIndex("by_user", q => q.eq("userId", user._id)).order("desc").collect();
    return { balance: account.availableBalance, currency: account.currency, cards };
  },
});

export const apply = mutation({
  args: { type: v.union(v.literal("virtual"), v.literal("physical")), brand: v.union(v.literal("visa"), v.literal("mastercard")) },
  handler: async (ctx, { type, brand }) => {
    const user = await requireUser(ctx);
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");
    const existing = await ctx.db.query("cards").withIndex("by_user", q => q.eq("userId", user._id)).collect();
    if (existing.some(c => ["pending", "active", "frozen"].includes(c.status))) throw new Error("CARD_ALREADY_EXISTS");
    const now = Date.now();
    const last4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const id = await ctx.db.insert("cards", { userId: user._id, last4, brand, type, status: "pending", spendingLimit: 1000, createdAt: now });
    await ctx.db.insert("auditLogs", { actorId: user._id, action: "CARD_APPLICATION_SUBMITTED", targetId: id, metadata: { type, brand }, createdAt: now });
    return { id, status: "pending", brand, type, last4, message: "Card application submitted for administrator review." };
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
    const cards = await ctx.db.query("cards").order("desc").take(1000);
    return Promise.all(cards.map(async card => ({ ...card, user: await ctx.db.get(card.userId) })));
  },
});
