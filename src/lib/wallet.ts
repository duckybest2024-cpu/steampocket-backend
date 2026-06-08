import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientFundsError";
  }
}

/**
 * Apply a signed balance delta atomically and append a ledger entry.
 * Negative deltas (bets, withdrawals) are rejected if they'd push the balance below zero —
 * this is the single choke point that guarantees the ledger and `User.balance` never drift apart.
 */
export async function applyLedgerEntry(
  db: Db,
  userId: string,
  type: string,
  delta: number,
  reference?: string
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const nextBalance = user.balance + delta;
  if (nextBalance < 0) throw new InsufficientFundsError();

  const updated = await db.user.update({
    where: { id: userId },
    data: { balance: nextBalance },
  });

  await db.transaction.create({
    data: {
      userId,
      type,
      amount: delta,
      balance: nextBalance,
      reference,
    },
  });

  return updated;
}

/** XP curve: level N requires N * 1000 XP cumulative. Wagering 100 cents = 1 XP. */
export function xpForWager(amountWagered: number): number {
  return Math.max(1, Math.floor(amountWagered / 100));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let threshold = 1000;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = level * 1000;
  }
  return level;
}
