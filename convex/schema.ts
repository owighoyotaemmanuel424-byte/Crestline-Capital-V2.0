import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const money = v.number();

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    email: v.string(),
    name: v.string(),
    accountNumber: v.string(),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    isFrozen: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_accountNumber", ["accountNumber"]),

  accounts: defineTable({
    userId: v.id("users"),
    type: v.string(),
    currency: v.string(),
    availableBalance: money,
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  recipients: defineTable({
    ownerId: v.id("users"),
    recipientUserId: v.id("users"),
    label: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_recipient", ["ownerId", "recipientUserId"]),

  transactions: defineTable({
    senderAccountId: v.optional(v.id("accounts")),
    receiverAccountId: v.optional(v.id("accounts")),
    type: v.string(),
    amount: money,
    fee: money,
    currency: v.string(),
    status: v.string(),
    description: v.string(),
    reference: v.string(),
    idempotencyKey: v.string(),
    deliveryStatus: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_idempotency", ["senderAccountId", "idempotencyKey"])
    .index("by_sender", ["senderAccountId"])
    .index("by_receiver", ["receiverAccountId"]),

  walletLedger: defineTable({
    accountId: v.id("accounts"),
    userId: v.id("users"),
    transactionId: v.id("transactions"),
    amount: money,
    currency: v.string(),
    direction: v.union(v.literal("DEBIT"), v.literal("CREDIT")),
    type: v.string(),
    status: v.string(),
    reference: v.string(),
    eventId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_transaction", ["transactionId"])
    .index("by_account", ["accountId"])
    .index("by_user", ["userId"])
    .index("by_eventId", ["eventId"]),

  transferRequests: defineTable({
    userId: v.id("users"),
    idempotencyKey: v.string(),
    transactionId: v.optional(v.id("transactions")),
    status: v.string(),
    response: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user_key", ["userId", "idempotencyKey"]),

  withdrawalRequests: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    amount: money,
    fee: money,
    total: money,
    destination: v.object({
      type: v.literal("bank"),
      accountName: v.string(),
      accountNumber: v.string(),
      bankCode: v.string(),
    }),
    status: v.string(),
    reference: v.string(),
    idempotencyKey: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_idempotency", ["userId", "idempotencyKey"])
    .index("by_reference", ["reference"]),

  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),
    action: v.string(),
    targetId: v.optional(v.string()),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_action", ["action"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    transactionId: v.optional(v.id("transactions")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    status: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  }).index("by_eventId", ["eventId"]),
});
