import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const importBatch = mutation({
  args: { secret: v.string(), transactions: v.array(v.object({ id:v.string(), senderId:v.string(), receiverId:v.optional(v.string()), amount:v.number(), fee:v.number(), type:v.string(), description:v.string(), status:v.string(), reference:v.string(), createdAt:v.number() })) },
  handler: async (ctx,{secret,transactions})=>{
    if(!process.env.MIGRATION_SECRET||secret!==process.env.MIGRATION_SECRET)throw new Error("FORBIDDEN");
    let imported=0,skipped=0;
    for(const source of transactions){
      if(await ctx.db.query("transactions").withIndex("by_legacyId",q=>q.eq("legacyId",source.id)).unique()){skipped++;continue;}
      const sender=await ctx.db.query("users").withIndex("by_legacyId",q=>q.eq("legacyId",source.senderId)).unique();
      const receiver=source.receiverId?await ctx.db.query("users").withIndex("by_legacyId",q=>q.eq("legacyId",source.receiverId)).unique():null;
      if(!sender){skipped++;continue;}
      const senderAccount=await ctx.db.query("accounts").withIndex("by_user",q=>q.eq("userId",sender._id)).first();
      const receiverAccount=receiver?await ctx.db.query("accounts").withIndex("by_user",q=>q.eq("userId",receiver._id)).first():null;
      if(!senderAccount){skipped++;continue;}
      const status=source.status.toUpperCase(); const reference=source.reference||`LEGACY-${source.id}`;
      const id=await ctx.db.insert("transactions",{legacyId:source.id,senderAccountId:senderAccount._id,receiverAccountId:receiverAccount?._id,type:source.type,amount:Number(source.amount.toFixed(2)),fee:Number(source.fee.toFixed(2)),currency:"USD",status,description:source.description||"",reference,idempotencyKey:`legacy:${source.id}`,createdAt:source.createdAt});
      if(status==="SUCCESS"){
        await ctx.db.insert("walletLedger",{accountId:senderAccount._id,userId:sender._id,transactionId:id,amount:Number((source.amount+source.fee).toFixed(2)),currency:"USD",direction:"DEBIT",type:source.type,status:"IMPORTED",reference,createdAt:source.createdAt});
        if(receiver&&receiverAccount)await ctx.db.insert("walletLedger",{accountId:receiverAccount._id,userId:receiver._id,transactionId:id,amount:Number(source.amount.toFixed(2)),currency:"USD",direction:"CREDIT",type:source.type,status:"IMPORTED",reference,createdAt:source.createdAt});
      }
      imported++;
    }
    return {imported,skipped};
  },
});
