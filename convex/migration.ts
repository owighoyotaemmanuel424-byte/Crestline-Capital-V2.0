import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const importUsers = mutation({
  args: { secret: v.string(), users: v.array(v.object({ id: v.string(), email: v.string(), name: v.string(), accountNumber: v.string(), balance: v.number(), isAdmin: v.boolean(), isFrozen: v.boolean() })) },
  handler: async (ctx, { secret, users }) => {
    if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) throw new Error("FORBIDDEN");
    for (const source of users) {
      const existing = await ctx.db.query("users").withIndex("by_legacyId", q => q.eq("legacyId", source.id)).unique();
      if (existing) continue;
      const userId = await ctx.db.insert("users", { authUserId: `legacy:${source.id}`, legacyId: source.id, email: source.email.toLowerCase(), name: source.name || "Crestline Customer", accountNumber: source.accountNumber, role: source.isAdmin ? "ADMIN" : "USER", isFrozen: source.isFrozen, createdAt: Date.now() });
      await ctx.db.insert("accounts", { userId, type: "PRIMARY", currency: "USD", availableBalance: source.balance, createdAt: Date.now() });
    }
    return { imported: users.length };
  },
});
