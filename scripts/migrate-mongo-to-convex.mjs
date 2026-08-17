import "dotenv/config";
import mongoose from "mongoose";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import User from "../backend/models/User.js";
import Transaction from "../backend/models/Transaction.js";
import WithdrawalRequest from "../backend/models/WithdrawalRequest.js";

const mongo = process.env.MONGODB_URI;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const secret = process.env.MIGRATION_SECRET;
if (!mongo || !convexUrl || !secret) throw new Error("MONGODB_URI, NEXT_PUBLIC_CONVEX_URL and MIGRATION_SECRET are required");
const convex = new ConvexHttpClient(convexUrl);
await mongoose.connect(mongo);

const users = await User.find().lean();
const userBatch = users.map((u) => ({ id: String(u._id), email: u.email, name: u.name || "Crestline Customer", accountNumber: u.accountNumber, balance: Number(u.balance?.toString?.() || u.balance || 0), isAdmin: Boolean(u.isAdmin), isFrozen: Boolean(u.isFrozen) }));
for (let i = 0; i < userBatch.length; i += 100) await convex.mutation(api.migration.importUsers, { secret, users: userBatch.slice(i, i + 100) });

const transactions = await Transaction.find().lean();
const txBatch = transactions.map((t) => ({ id: String(t._id), senderId: String(t.senderId), receiverId: t.receiverId ? String(t.receiverId) : undefined, amount: Number(t.amount?.toString?.() || t.amount || 0), fee: Number(t.fee?.toString?.() || t.fee || 0), type: t.type || "internal", description: t.description || "", status: t.status || "success", reference: t.reference || String(t._id), createdAt: new Date(t.createdAt).getTime() }));
for (let i = 0; i < txBatch.length; i += 50) await convex.mutation(api.migrationTransactions.importBatch, { secret, transactions: txBatch.slice(i, i + 50) });

const withdrawals = await WithdrawalRequest.find().lean();
const withdrawalBatch = withdrawals.map((w) => ({ id: String(w._id), userId: String(w.userId), amount: Number(w.amount?.toString?.() || w.amount || 0), fee: Number(w.fee?.toString?.() || w.fee || 0), total: Number(w.total?.toString?.() || w.total || 0), accountName: w.destination?.accountName || "", accountNumber: w.destination?.accountNumber || "", bankCode: w.destination?.bankCode || "", status: w.status || "pending", reference: w.reference || String(w._id), createdAt: new Date(w.createdAt).getTime() }));
for (let i = 0; i < withdrawalBatch.length; i += 50) await convex.mutation(api.migrationWithdrawals.importBatch, { secret, withdrawals: withdrawalBatch.slice(i, i + 50) });

await mongoose.disconnect();
console.log(`Migrated ${userBatch.length} users, ${txBatch.length} transactions and ${withdrawalBatch.length} withdrawals to Convex.`);
