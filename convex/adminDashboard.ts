import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [users, transactions] = await Promise.all([
      ctx.db.query("users").order("desc").take(500),
      ctx.db.query("transactions").order("desc").take(500),
    ]);
    const deposits = transactions.filter(t => ["deposit", "funding"].includes(t.type));
    const transfers = transactions.filter(t => t.type.includes("transfer"));
    return {
      users,
      transactions,
      metrics: {
        totalUsers: users.length,
        blockedUsers: users.filter(u => u.isFrozen).length,
        totalDeposits: deposits.reduce((s, t) => s + t.amount, 0),
        pendingDeposits: deposits.filter(t => t.status === "pending").length,
        totalTransfers: transfers.reduce((s, t) => s + t.amount, 0),
        pendingTransfers: transfers.filter(t => t.status === "pending").length,
        updatedAt: Date.now(),
      },
    };
  },
});
