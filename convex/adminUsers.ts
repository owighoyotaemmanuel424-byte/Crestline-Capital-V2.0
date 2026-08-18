import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(1000);
    return users;
  },
});

export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("auditLogs").order("desc").take(1000);
    return Promise.all(logs.map(async (log) => ({
      ...log,
      actor: log.actorId ? await ctx.db.get(log.actorId) : null,
    })));
  },
});
