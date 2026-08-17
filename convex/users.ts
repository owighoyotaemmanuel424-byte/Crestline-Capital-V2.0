import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, requireUser } from "./helpers";

function newAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

export const ensureProfile = mutation({
  args: { name: v.optional(v.string()), email: v.optional(v.string()), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const existing = await ctx.db.query("users").withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject)).unique();
    if (existing) return existing;

    let accountNumber = newAccountNumber();
    while (await ctx.db.query("users").withIndex("by_accountNumber", (q) => q.eq("accountNumber", accountNumber)).first()) accountNumber = newAccountNumber();
    const now = Date.now();
    const pinHash = args.pin ? await bcrypt.hash(args.pin, 12) : undefined;
    const userId = await ctx.db.insert("users", {
      authUserId: identity.subject,
      email: args.email || identity.email || "",
      name: args.name || identity.name || "Crestline Customer",
      accountNumber,
      role: "USER",
      isFrozen: false,
      pinHash,
      createdAt: now,
    });
    await ctx.db.insert("accounts", { userId, type: "PRIMARY", currency: "USD", availableBalance: 0, createdAt: now });
    return await ctx.db.get(userId);
  },
});

export const setTransactionPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const user = await requireUser(ctx);
    if (!/^\d{4,6}$/.test(pin)) throw new Error("INVALID_PIN");
    await ctx.db.patch(user._id, { pinHash: await bcrypt.hash(pin, 12) });
    return { ok: true };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const account = await getPrimaryAccount(ctx, user._id);
    return { ...user, balance: account.availableBalance, currency: account.currency };
  },
});
