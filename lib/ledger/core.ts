import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";

type LedgerTransactionClient = Prisma.TransactionClient;

export async function createLedgerTransaction({
  description,
  entries,
}: {
  description: string;
  entries: { accountId: string; amount: Decimal }[];
}) {
  const total = entries.reduce((a, e) => a.plus(e.amount), new Decimal(0));

  if (!total.isZero()) {
    throw new Error("Transaction is not balanced. Total must be zero.");
  }

  return prisma.$transaction(async (tx: LedgerTransactionClient) => {
    const transaction = await tx.transaction.create({
      data: { description },
    });

    await tx.entry.createMany({
      data: entries.map((e) => ({
        accountId: e.accountId,
        amount: e.amount,
        transactionId: transaction.id,
      })),
    });

    return transaction;
  });
}

export async function getAccountBalance(accountId: string) {
  const result = await prisma.entry.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });

  return new Decimal(result._sum.amount || 0);
}
