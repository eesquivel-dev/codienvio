import { Prisma, type WalletTxnType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { insufficientBalanceError, type WalletLedgerRow } from "@/lib/wallet-copy";

export type { WalletLedgerRow, WalletTxnType } from "@/lib/wallet-copy";
export {
  assertSufficientBalance,
  canAfford,
  insufficientBalanceError,
  insufficientBalanceMessage,
  walletTxnTypeLabel,
} from "@/lib/wallet-copy";

export type WalletDb = Prisma.TransactionClient | typeof prisma;

async function currentBalanceMxn(db: WalletDb, clientId: string): Promise<number> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { balanceMxn: true },
  });
  return asMoney(client?.balanceMxn ?? 0);
}

/**
 * Atomically decrement prepaid balance when it covers `amountMxn`.
 * Concurrent purchases cannot overdraw: the WHERE includes balance >= amount.
 */
export async function reserveClientFunds(
  db: WalletDb,
  clientId: string,
  amountMxn: number,
): Promise<{ previousMxn: number; nextMxn: number }> {
  const amount = asMoney(amountMxn);
  if (amount <= 0) {
    throw new AppError("El cargo debe ser mayor a 0", 400, "INVALID_AMOUNT");
  }

  const previousMxn = await currentBalanceMxn(db, clientId);
  const updated = await db.client.updateMany({
    where: {
      id: clientId,
      balanceMxn: { gte: amount },
    },
    data: { balanceMxn: { decrement: amount } },
  });

  if (updated.count !== 1) {
    throw insufficientBalanceError(previousMxn, amount);
  }

  return { previousMxn, nextMxn: asMoney(previousMxn - amount) };
}

export async function releaseClientFunds(db: WalletDb, clientId: string, amountMxn: number): Promise<void> {
  const amount = asMoney(amountMxn);
  if (amount <= 0) return;
  await db.client.update({
    where: { id: clientId },
    data: { balanceMxn: { increment: amount } },
  });
}

export async function recordPurchaseCharge(
  db: WalletDb,
  params: {
    clientId: string;
    amountMxn: number;
    shipmentId: string;
    note?: string;
  },
): Promise<void> {
  await db.walletTransaction.create({
    data: {
      clientId: params.clientId,
      amountMxn: -asMoney(params.amountMxn),
      type: "PURCHASE",
      shipmentId: params.shipmentId,
      note: params.note ?? "Compra de guía",
    },
  });
}

export async function adjustClientWallet(params: {
  clientId: string;
  amountMxn: number;
  direction: "credit" | "debit";
  note: string;
  createdByUserId: string;
}): Promise<{ balanceMxn: number }> {
  const amount = asMoney(params.amountMxn);
  if (amount <= 0) {
    throw new AppError("El monto debe ser mayor a 0", 400, "INVALID_AMOUNT");
  }
  const note = params.note.trim();
  if (note.length < 2) {
    throw new AppError("Indica un motivo de la operación", 400, "NOTE_REQUIRED");
  }

  const type: WalletTxnType = params.direction === "credit" ? "TOP_UP" : "ADJUSTMENT";
  const signed = params.direction === "credit" ? amount : -amount;

  return prisma.$transaction(async (tx) => {
    if (params.direction === "debit") {
      const reserved = await reserveClientFunds(tx, params.clientId, amount);
      await tx.walletTransaction.create({
        data: {
          clientId: params.clientId,
          amountMxn: signed,
          type,
          note,
          createdByUserId: params.createdByUserId,
        },
      });
      return { balanceMxn: reserved.nextMxn };
    }

    const updated = await tx.client.update({
      where: { id: params.clientId },
      data: { balanceMxn: { increment: amount } },
      select: { balanceMxn: true },
    });
    await tx.walletTransaction.create({
      data: {
        clientId: params.clientId,
        amountMxn: signed,
        type,
        note,
        createdByUserId: params.createdByUserId,
      },
    });
    return { balanceMxn: asMoney(updated.balanceMxn) };
  });
}

export async function getClientWallet(clientId: string, ledgerTake = 8): Promise<{
  balanceMxn: number;
  ledger: WalletLedgerRow[];
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      balanceMxn: true,
      walletTxns: {
        orderBy: { createdAt: "desc" },
        take: ledgerTake,
        select: {
          id: true,
          type: true,
          amountMxn: true,
          note: true,
          shipmentId: true,
          createdAt: true,
        },
      },
    },
  });
  if (!client) {
    throw new AppError("Cliente no encontrado", 404, "CLIENT_NOT_FOUND");
  }
  return {
    balanceMxn: asMoney(client.balanceMxn),
    ledger: client.walletTxns.map((row) => ({
      id: row.id,
      type: row.type,
      amountMxn: asMoney(row.amountMxn),
      note: row.note,
      shipmentId: row.shipmentId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
