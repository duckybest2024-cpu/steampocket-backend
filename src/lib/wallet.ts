import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientFundsError";
  }
}

// Transaction types where the player pays the house — house chips increase
const HOUSE_CREDIT_TYPES = new Set(["bet", "coinflip_bet"]);
// Transaction types where the house pays the player — house chips decrease
const HOUSE_DEBIT_TYPES = new Set([
  "payout", "coinflip_payout", "coinflip_refund",
  "levelup_bonus", "rakeback", "free_chips", "deposit",
]);

/** Update house chip reserve. fire-and-forget — never throws. */
async function updateHouseChips(db: Db, chipsChange: number, dollarsChange = 0): Promise<void> {
  if (chipsChange === 0 && dollarsChange === 0) return;
  const updateData: Record<string, unknown> = {};
  if (chipsChange !== 0) updateData.chips = { increment: chipsChange };
  if (dollarsChange !== 0) updateData.dollars = { increment: dollarsChange };
  await (db as PrismaClient).houseBank
    .upsert({
      where: { id: "singleton" },
      create: { id: "singleton", chips: 1_000_000_000 + chipsChange, dollars: 1_000_000_000 + dollarsChange },
      update: updateData,
    })
    .catch((err: unknown) => console.error("House bank update failed (non-fatal):", err));
}

export { updateHouseChips };

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

  // Keep house bank chips in sync with game results
  if (HOUSE_CREDIT_TYPES.has(type)) {
    await updateHouseChips(db, Math.abs(delta));
  } else if (HOUSE_DEBIT_TYPES.has(type)) {
    await updateHouseChips(db, -Math.abs(delta));
  }

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
