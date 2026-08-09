"use server";

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Card, User, connectMongo, mongoose } from "@/lib/server-banking";

type Session = { userId?: string };

async function getUser(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) throw new Error("Authentication required");
  const payload = jwt.verify(token, secret) as Session;
  if (!payload.userId || !mongoose.isValidObjectId(payload.userId)) throw new Error("Authentication required");
  await connectMongo();
  const user = await User.findById(payload.userId).select("name email accountNumber isFrozen balance");
  if (!user) throw new Error("Account not found");
  if (user.isFrozen) throw new Error("Your account is frozen");
  return user;
}

export async function getMyCards(token: string) {
  const user = await getUser(token);
  const cards = await Card.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  return {
    balance: Number(user.balance?.toString?.() || user.balance || 0),
    cards: cards.map((card: any) => ({
      id: String(card._id),
      last4: card.last4,
      brand: card.brand,
      type: card.type,
      status: card.status,
      spendingLimit: Number(card.spendingLimit?.toString() || 0),
      issuedAt: card.issuedAt,
      createdAt: card.createdAt,
    })),
  };
}

export async function applyForCard(token: string, type: "virtual" | "physical" = "virtual", brand: "visa" | "mastercard" = "visa") {
  const user = await getUser(token);
  const existing = await Card.findOne({ userId: user._id, status: { $in: ["pending", "active", "frozen"] } });
  if (existing) throw new Error(existing.status === "pending" ? "You already have a card application under review." : "You already have an active card.");
  const last4 = crypto.randomInt(0, 10000).toString().padStart(4, "0");
  const card = await Card.create({ userId: user._id, brand, type, last4, status: "pending", spendingLimit: mongoose.Types.Decimal128.fromString("1000.00") });
  return { id: String(card._id), status: card.status, brand: card.brand, type: card.type, last4: card.last4, message: "Card application submitted for administrator review." };
}
