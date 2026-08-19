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

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [users, transactions] = await Promise.all([
      ctx.db.query("users").order("desc").take(500),
      ctx.db.query("transactions").order("desc").take(500),
    ]);
    const deposits = transactions.filter(t => ["deposit", "funding"].includes(t.type.toLowerCase()));
    const transfers = transactions.filter(t => t.type.toLowerCase().includes("transfer"));
    return {
      users: users.map(publicUser),
      transactions,
      metrics: {
        totalUsers: users.length,
        blockedUsers: users.filter(u => u.isFrozen).length,
        totalDeposits: deposits.filter(t => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0),
        pendingDeposits: deposits.filter(t => t.status === "PENDING").length,
        totalTransfers: transfers.filter(t => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0),
        pendingTransfers: transfers.filter(t => t.status === "PENDING").length,
        updatedAt: Date.now(),
      },
    };
  },
});
