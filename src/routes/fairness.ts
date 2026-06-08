import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { createSeedPair, hashServerSeed, verifyHash, floatFromSeed } from "../lib/provablyFair";

export const fairnessRouter = Router();

/**
 * Rotate to a fresh server seed. The *current* (now-spent) seed is revealed in full —
 * along with how many bets were made under it — so the player can independently replay
 * every wager and confirm the published hash matches and every roll was honest.
 */
fairnessRouter.post("/rotate", requireAuth, async (req: AuthedRequest, res) => {
  const newClientSeed = typeof req.body?.clientSeed === "string" && req.body.clientSeed.trim().length > 0
    ? req.body.clientSeed.trim().slice(0, 64)
    : undefined;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  const nextPair = createSeedPair(newClientSeed ?? user.clientSeed);

  const [, , rotation] = await prisma.$transaction([
    prisma.seedRotation.create({
      data: {
        userId: user.id,
        serverSeed: user.serverSeed,
        serverSeedHash: user.serverSeedHash,
        clientSeed: user.clientSeed,
        nonceCount: user.nonce,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        serverSeed: nextPair.serverSeed,
        serverSeedHash: nextPair.serverSeedHash,
        clientSeed: nextPair.clientSeed,
        nonce: 0,
      },
    }),
    prisma.seedRotation.findFirst({ where: { userId: user.id }, orderBy: { rotatedAt: "desc" } }),
  ]);

  res.json({
    revealed: {
      serverSeed: rotation!.serverSeed,
      serverSeedHash: rotation!.serverSeedHash,
      clientSeed: rotation!.clientSeed,
      betsPlaced: rotation!.nonceCount,
      hashMatches: verifyHash(rotation!.serverSeed, rotation!.serverSeedHash),
    },
    next: {
      serverSeedHash: nextPair.serverSeedHash,
      clientSeed: nextPair.clientSeed,
    },
  });
});

fairnessRouter.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const rotations = await prisma.seedRotation.findMany({
    where: { userId: req.userId! },
    orderBy: { rotatedAt: "desc" },
    take: 25,
  });
  res.json({ rotations });
});

const verifySchema = z.object({
  serverSeed: z.string().min(1),
  serverSeedHash: z.string().min(1).optional(),
  clientSeed: z.string().min(1),
  nonce: z.number().int().min(0),
});

/**
 * Stateless replay endpoint — given a (revealed) server seed + client seed + nonce,
 * recompute the raw float the engine would have derived. Anyone can use this to
 * cross-check a settled bet's outcome without trusting our server at all.
 */
fairnessRouter.post("/verify", (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { serverSeed, serverSeedHash, clientSeed, nonce } = parsed.data;
  const computedHash = hashServerSeed(serverSeed);
  const float = floatFromSeed(serverSeed, clientSeed, nonce);

  res.json({
    computedHash,
    hashMatches: serverSeedHash ? computedHash === serverSeedHash : null,
    rawFloat: float,
    derived: {
      diceRoll_0to100: Math.floor(float * 10_000) / 100,
      roulettePocket_0to36: Math.floor(float * 37),
    },
  });
});
