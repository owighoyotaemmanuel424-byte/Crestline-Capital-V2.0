import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPrimaryAccount, requireAdmin } from "./helpers";

function publicUser(user: any, account?: any) { return { id:user._id, name:user.name, email:user.email, accountNumber:user.accountNumber, role:user.role, isFrozen:user.isFrozen, createdAt:user.createdAt, balance:account?.availableBalance||0, currency:account?.currency||"USD" }; }

export const listUsers = query({ args:{}, handler:async(ctx)=>{await requireAdmin(ctx);return (await ctx.db.query("users").order("desc").take(500)).map(publicUser);} });

export const getUser = query({ args:{userId:v.id("users")}, handler:async(ctx,{userId})=>{await requireAdmin(ctx);const user=await ctx.db.get(userId);if(!user)throw new Error("USER_NOT_FOUND");const account=await getPrimaryAccount(ctx,userId);const [sent,received]=await Promise.all([ctx.db.query("transactions").withIndex("by_sender",q=>q.eq("senderAccountId",account._id)).order("desc").take(100),ctx.db.query("transactions").withIndex("by_receiver",q=>q.eq("receiverAccountId",account._id)).order("desc").take(100)]);return {user:publicUser(user,account),transactions:[...sent,...received].sort((a,b)=>b.createdAt-a.createdAt).slice(0,100)};} });

export const setFrozen = mutation({ args:{userId:v.id("users"),frozen:v.boolean()}, handler:async(ctx,{userId,frozen})=>{const admin=await requireAdmin(ctx);const target=await ctx.db.get(userId);if(!target)throw new Error("USER_NOT_FOUND");if(target.role==="ADMIN"&&frozen)throw new Error("CANNOT_FREEZE_ADMIN");await ctx.db.patch(userId,{isFrozen:frozen});await ctx.db.insert("auditLogs",{actorId:admin._id,action:frozen?"ACCOUNT_FROZEN":"ACCOUNT_UNFROZEN",targetId:userId,createdAt:Date.now()});return {ok:true};} });
export const audit = query({ args:{}, handler:async(ctx)=>{await requireAdmin(ctx);return await ctx.db.query("auditLogs").order("desc").take(500);} });
