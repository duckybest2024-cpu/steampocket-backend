import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { applyLedgerEntry } from "../lib/wallet";

export const nftRouter = Router();

nftRouter.get("/collection", requireAuth, async (req: AuthedRequest, res) => {
  const nfts = await prisma.nft.findMany({
    where: { ownerId: req.userId! },
    orderBy: { mintedAt: "desc" },
  });
  res.json({ nfts });
});

nftRouter.get("/collection/:userId", async (req, res) => {
  const nfts = await prisma.nft.findMany({
    where: { ownerId: req.params.userId },
    orderBy: { mintedAt: "desc" },
  });
  res.json({ nfts });
});

// --------------- Trade offers ---------------

const createTradeSchema = z.object({
  toUsername: z.string().min(1),
  offeredChips: z.number().int().min(0).default(0),
  requestedChips: z.number().int().min(0).default(0),
  offeredNftIds: z.array(z.string()).default([]),
  requestedNftIds: z.array(z.string()).default([]),
  message: z.string().max(200).optional(),
});

nftRouter.post("/trade/offer", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = createTradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const fromId = req.userId!;
    const { toUsername, offeredChips, requestedChips, offeredNftIds, requestedNftIds, message } = parsed.data;

    if (offeredChips === 0 && requestedChips === 0 && offeredNftIds.length === 0 && requestedNftIds.length === 0) {
      return res.status(400).json({ error: "Trade offer must include at least one item or chips" });
    }

    const toUser = await prisma.user.findUnique({ where: { username: toUsername } });
    if (!toUser) return res.status(404).json({ error: "User not found" });
    if (toUser.id === fromId) return res.status(400).json({ error: "Can't trade with yourself" });

    const fromUser = await prisma.user.findUniqueOrThrow({ where: { id: fromId } });
    if (offeredChips > 0 && fromUser.balance < offeredChips) {
      return res.status(400).json({ error: "Insufficient chips for this offer" });
    }

    // Verify offered NFTs are owned by sender
    if (offeredNftIds.length > 0) {
      const owned = await prisma.nft.findMany({ where: { id: { in: offeredNftIds }, ownerId: fromId } });
      if (owned.length !== offeredNftIds.length) return res.status(400).json({ error: "You don't own all offered NFTs" });
    }

    // Verify requested NFTs are owned by recipient
    if (requestedNftIds.length > 0) {
      const owned = await prisma.nft.findMany({ where: { id: { in: requestedNftIds }, ownerId: toUser.id } });
      if (owned.length !== requestedNftIds.length) return res.status(400).json({ error: "Recipient doesn't own all requested NFTs" });
    }

    const offer = await prisma.tradeOffer.create({
      data: {
        fromId,
        toId: toUser.id,
        offeredChips,
        requestedChips,
        message,
        items: {
          create: [
            ...offeredNftIds.map((nftId) => ({ nftId, side: "offered" })),
            ...requestedNftIds.map((nftId) => ({ nftId, side: "requested" })),
          ],
        },
      },
      include: { items: { include: { nft: true } } },
    });

    res.json({ offer });
  } catch (err) {
    console.error("Trade offer error:", err);
    res.status(500).json({ error: "Failed to create trade offer" });
  }
});

nftRouter.get("/trade/inbox", requireAuth, async (req: AuthedRequest, res) => {
  const offers = await prisma.tradeOffer.findMany({
    where: { toId: req.userId!, status: "pending" },
    include: {
      from: { select: { username: true, rank: true } },
      items: { include: { nft: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ offers });
});

nftRouter.get("/trade/sent", requireAuth, async (req: AuthedRequest, res) => {
  const offers = await prisma.tradeOffer.findMany({
    where: { fromId: req.userId! },
    include: {
      to: { select: { username: true, rank: true } },
      items: { include: { nft: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ offers });
});

nftRouter.post("/trade/:id/accept", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const offer = await prisma.tradeOffer.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { nft: true } } },
    });
    if (!offer) return res.status(404).json({ error: "Trade offer not found" });
    if (offer.toId !== userId) return res.status(403).json({ error: "Not your trade offer" });
    if (offer.status !== "pending") return res.status(400).json({ error: "Offer is no longer pending" });

    const toUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const fromUser = await prisma.user.findUniqueOrThrow({ where: { id: offer.fromId } });

    if (offer.requestedChips > 0 && toUser.balance < offer.requestedChips) {
      return res.status(400).json({ error: "You don't have enough chips" });
    }
    if (offer.offeredChips > 0 && fromUser.balance < offer.offeredChips) {
      return res.status(400).json({ error: "Sender no longer has enough chips" });
    }

    await prisma.$transaction(async (tx) => {
      // Transfer chips
      if (offer.offeredChips > 0) {
        await tx.user.update({ where: { id: offer.fromId }, data: { balance: { decrement: offer.offeredChips } } });
        await tx.user.update({ where: { id: userId }, data: { balance: { increment: offer.offeredChips } } });
      }
      if (offer.requestedChips > 0) {
        await tx.user.update({ where: { id: userId }, data: { balance: { decrement: offer.requestedChips } } });
        await tx.user.update({ where: { id: offer.fromId }, data: { balance: { increment: offer.requestedChips } } });
      }

      // Transfer NFTs
      const offeredNfts = offer.items.filter((i) => i.side === "offered").map((i) => i.nftId);
      const requestedNfts = offer.items.filter((i) => i.side === "requested").map((i) => i.nftId);

      if (offeredNfts.length > 0) {
        await tx.nft.updateMany({ where: { id: { in: offeredNfts } }, data: { ownerId: userId } });
      }
      if (requestedNfts.length > 0) {
        await tx.nft.updateMany({ where: { id: { in: requestedNfts } }, data: { ownerId: offer.fromId } });
      }

      await tx.tradeOffer.update({ where: { id: offer.id }, data: { status: "accepted" } });
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Trade accept error:", err);
    res.status(500).json({ error: "Failed to accept trade" });
  }
});

nftRouter.post("/trade/:id/decline", requireAuth, async (req: AuthedRequest, res) => {
  const offer = await prisma.tradeOffer.findUnique({ where: { id: req.params.id } });
  if (!offer) return res.status(404).json({ error: "Not found" });
  if (offer.toId !== req.userId! && offer.fromId !== req.userId!) return res.status(403).json({ error: "Forbidden" });
  if (offer.status !== "pending") return res.status(400).json({ error: "Already resolved" });
  const status = offer.fromId === req.userId! ? "cancelled" : "declined";
  await prisma.tradeOffer.update({ where: { id: offer.id }, data: { status } });
  res.json({ success: true });
});
