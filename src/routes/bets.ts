import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { hashServerSeed } from "../lib/provablyFair";

export const betsRouter = Router();

betsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const game = typeof req.query.game === "string" ? req.query.game : undefined;

  const where = { userId: req.userId!, ...(game ? { game } : {}) };

  const [items, total, user] = await Promise.all([
    prisma.bet.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.bet.count({ where }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId! } }),
  ]);

  res.json({
    page,
    pageSize,
    total,
    items: items.map((b) => serializeBet(b, user.serverSeed)),
  });
});

betsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const [bet, user] = await Promise.all([
    prisma.bet.findFirst({ where: { id: req.params.id, userId: req.userId! } }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId! } }),
  ]);
  if (!bet) return res.status(404).json({ error: "Bet not found" });
  res.json({ bet: serializeBet(bet, user.serverSeed) });
});

/** Recent public feed — every user's last 50 bets, usernames included, seeds withheld until rotation. */
betsRouter.get("/feed/recent", async (_req, res) => {
  const bets = await prisma.bet.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { username: true, level: true } } },
  });

  res.json({
    items: bets.map((b) => ({
      id: b.id,
      username: b.user.username,
      level: b.user.level,
      game: b.game,
      amount: b.amount,
      payout: b.payout,
      multiplier: b.multiplier,
      result: b.result,
      createdAt: b.createdAt,
    })),
  });
});

/**
 * Reveal `serverSeed` only once it has been rotated out (i.e. it no longer matches the
 * user's *active* seed). Showing a still-active seed would let the player precompute every
 * future roll for known (clientSeed, nonce) pairs — so while a seed is live we show only its
 * hash, exactly like the pre-bet commitment the player already saw.
 */
function serializeBet(
  bet: {
    id: string;
    game: string;
    amount: number;
    payout: number;
    multiplier: number;
    state: string;
    result: string;
    clientSeed: string;
    serverSeed: string;
    nonce: number;
    createdAt: Date;
  },
  activeServerSeed: string
) {
  const isRevealed = bet.serverSeed !== activeServerSeed;

  return {
    id: bet.id,
    game: bet.game,
    amount: bet.amount,
    payout: bet.payout,
    multiplier: bet.multiplier,
    result: bet.result,
    state: JSON.parse(bet.state),
    fairness: {
      clientSeed: bet.clientSeed,
      serverSeedHash: hashServerSeed(bet.serverSeed),
      serverSeed: isRevealed ? bet.serverSeed : null,
      revealed: isRevealed,
      nonce: bet.nonce,
    },
    createdAt: bet.createdAt,
  };
}
