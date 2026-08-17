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

export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("auditLogs").order("desc").take(500);
  },
});
