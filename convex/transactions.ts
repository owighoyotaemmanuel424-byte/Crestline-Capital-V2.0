import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPrimaryAccount, requireUser } from "./helpers";

export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await requireUser(ctx);
    const account = await getPrimaryAccount(ctx, user._id);
    const [sent, received] = await Promise.all([
      ctx.db.query("transactions").withIndex("by_sender", (q) => q.eq("senderAccountId", account._id)).order("desc").take(Math.min(limit ?? 100, 100)),
      ctx.db.query("transactions").withIndex("by_receiver", (q) => q.eq("receiverAccountId", account._id)).order("desc").take(Math.min(limit ?? 100, 100)),
    ]);
    const map = new Map<string, (typeof sent)[number]>();
    for (const transaction of [...sent, ...received]) map.set(transaction._id, transaction);
    return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
  },
});
