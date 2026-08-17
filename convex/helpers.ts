import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return identity;
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique();
  if (!user) throw new Error("PROFILE_NOT_FOUND");
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function getPrimaryAccount(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!account) throw new Error("ACCOUNT_NOT_FOUND");
  return account;
}

export function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
