import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";

function publicUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    accountNumber: user.accountNumber,
    role: user.role,
    isFrozen: user.isFrozen,
    createdAt: user.createdAt,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(1000);
    return users.map(publicUser);
  },
});

export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("auditLogs").order("desc").take(1000);
    return Promise.all(logs.map(async (log) => ({
      ...log,
      actor: log.actorId ? (() => ctx.db.get(log.actorId).then((user) => user ? publicUser(user) : null))() : null,
    })));
  },
});
