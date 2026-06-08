import { prisma } from "./prisma";
import { applyLedgerEntry, levelFromXp, xpForWager } from "./wallet";

export interface BetResolution {
  payout: number;
  multiplier: number;
  result: "win" | "loss";
  state: unknown; // serialised per-game round detail (dice roll, mine layout, card hands, ...)
}

export interface PlacedBet {
  bet: { id: string; createdAt: Date };
  balance: number;
  level: number;
  xp: number;
  leveledUp: boolean;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  resolution: BetResolution;
}

/**
 * Single choke-point for "spend money, run a provably-fair game, pay out the result."
 * Wrapped in one DB transaction so a crash mid-resolution can never leave a player
 * charged without a settled bet, or paid without having been charged.
 *
 * `resolve` receives the *current* seed pair + nonce (the one this wager will be settled
 * under) and must be a pure function of them — that's what makes the bet replayable later.
 */
export async function placeBet(
  userId: string,
  game: string,
  amount: number,
  resolve: (seeds: { serverSeed: string; clientSeed: string; nonce: number }) => BetResolution
): Promise<PlacedBet> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadBetInputError("amount must be a positive integer (cents)");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const seeds = { serverSeed: user.serverSeed, clientSeed: user.clientSeed, nonce: user.nonce };

    // 1. Take the wager.
    await applyLedgerEntry(tx, userId, "bet", -amount, undefined);

    // 2. Resolve the round deterministically from the current seed triple.
    const resolution = resolve(seeds);

    // 3. Pay out (if anything was won).
    let afterPayout = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (resolution.payout > 0) {
      afterPayout = await applyLedgerEntry(tx, userId, "payout", resolution.payout, undefined);
    }

    // 4. XP / leveling from wager volume (win or lose, the house always rewards action).
    const gainedXp = xpForWager(amount);
    const newXp = afterPayout.xp + gainedXp;
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > afterPayout.level;

    let levelBonus = 0;
    if (leveledUp) levelBonus = newLevel * 500; // small cash bonus per level gained, in cents

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
        nonce: { increment: 1 },
        ...(levelBonus > 0 ? { balance: { increment: levelBonus } } : {}),
      },
    });

    if (levelBonus > 0) {
      await tx.transaction.create({
        data: {
          userId,
          type: "levelup_bonus",
          amount: levelBonus,
          balance: updated.balance,
          reference: `level_${newLevel}`,
        },
      });
    }

    const bet = await tx.bet.create({
      data: {
        userId,
        game,
        amount,
        payout: resolution.payout,
        multiplier: resolution.multiplier,
        state: JSON.stringify(resolution.state),
        result: resolution.result,
        clientSeed: seeds.clientSeed,
        serverSeed: seeds.serverSeed,
        nonce: seeds.nonce,
      },
    });

    return {
      bet: { id: bet.id, createdAt: bet.createdAt },
      balance: updated.balance,
      level: updated.level,
      xp: updated.xp,
      leveledUp,
      serverSeed: seeds.serverSeed,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
      resolution,
    };
  });
}

export class BadBetInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadBetInputError";
  }
}
