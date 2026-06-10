import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const leaderboardRouter = Router();

// GET /leaderboard — public, top 50 players by balance + bank DESC
leaderboardRouter.get("/leaderboard", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isBanned: false },
      include: {
        _count: { select: { bets: true } },
      },
      orderBy: [
        // Prisma doesn't support computed order on balance+bank natively,
        // so fetch enough rows and sort in JS.
        { balance: "desc" },
      ],
      take: 500, // over-fetch so we can sort on totalChips
    });

    const sorted = users
      .map((u) => ({
        username: u.username,
        totalChips: u.balance + u.bank,
        level: u.level,
        betCount: u._count.bets,
      }))
      .sort((a, b) => b.totalChips - a.totalChips)
      .slice(0, 50)
      .map((u, i) => ({ rank: i + 1, ...u }));

    res.json({ leaderboard: sorted });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

// GET /leaderboard/me — authed, returns caller's rank
leaderboardRouter.get("/leaderboard/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const allUsers = await prisma.user.findMany({
      where: { isBanned: false },
      include: { _count: { select: { bets: true } } },
    });

    const sorted = allUsers
      .map((u) => ({
        id: u.id,
        username: u.username,
        totalChips: u.balance + u.bank,
        level: u.level,
        betCount: u._count.bets,
      }))
      .sort((a, b) => b.totalChips - a.totalChips);

    const idx = sorted.findIndex((u) => u.id === req.userId);
    if (idx === -1) {
      return res.status(404).json({ error: "User not found on leaderboard" });
    }

    const { id: _id, ...entry } = sorted[idx];
    res.json({ rank: idx + 1, ...entry });
  } catch (err) {
    console.error("Leaderboard/me error:", err);
    res.status(500).json({ error: "Failed to load rank" });
  }
});
