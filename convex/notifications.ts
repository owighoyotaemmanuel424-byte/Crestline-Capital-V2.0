import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(100);
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(id);
    if (!notification || notification.userId !== user._id) throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { read: true });
    return { ok: true };
  },
});
