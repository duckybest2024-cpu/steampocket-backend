import { RequestHandler, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { isOwner } from "../lib/owner";

export const adminRouter = Router();

// ---------------------------------------------------------------------------
// Admin-only middleware: requireAuth + case-insensitive owner username check
// ---------------------------------------------------------------------------
const adminOnly: RequestHandler[] = [
  requireAuth as RequestHandler,
  async (req: AuthedRequest, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !isOwner(user.username)) {
      return res.status(403).json({ error: "Admin only" });
    }
    next();
  },
];

// Apply adminOnly to everything on this router
adminRouter.use(adminOnly);

// ---------------------------------------------------------------------------
// GET /admin/stats
// ---------------------------------------------------------------------------
adminRouter.get("/stats", async (_req, res) => {
  try {
    const [totalUsers, totalBets, betAgg, activeRoundsCount] = await Promise.all([
      prisma.user.count(),
      prisma.bet.count(),
      prisma.bet.aggregate({ _sum: { amount: true, payout: true } }),
      prisma.crashRound.count({ where: { state: { in: ["betting", "running"] } } }),
    ]);

    const totalWagered = betAgg._sum.amount ?? 0;
    const totalPaidOut = betAgg._sum.payout ?? 0;
    const houseEdgeRaw = totalWagered > 0 ? ((totalWagered - totalPaidOut) / totalWagered) * 100 : 0;
    const houseEdge = `${houseEdgeRaw.toFixed(2)}%`;

    res.json({ totalUsers, totalBets, totalWagered, totalPaidOut, houseEdge, activeRoundsCount });
  } catch (err) {
    console.error("GET /admin/stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ---------------------------------------------------------------------------
// GET /admin/users — paginated user list with optional search
// ---------------------------------------------------------------------------
adminRouter.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

    const where = search ? { username: { contains: search } } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { _count: { select: { bets: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        balance: u.balance,
        bank: u.bank,
        level: u.level,
        xp: u.xp,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
        betCount: u._count.bets,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /admin/users error:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/ban/:userId — toggle ban
// ---------------------------------------------------------------------------
adminRouter.post("/ban/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned },
    });

    res.json({ isBanned: updated.isBanned });
  } catch (err) {
    console.error("POST /admin/ban/:userId error:", err);
    res.status(500).json({ error: "Failed to update ban status" });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/adjust-balance/:userId — add amount (can be negative) to balance
// ---------------------------------------------------------------------------
const adjustSchema = z.object({
  amount: z.number().int(),
  note: z.string().min(1),
});

adminRouter.post("/adjust-balance/:userId", async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { amount, note } = parsed.data;
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: "admin_adjustment",
          amount,
          balance: u.balance,
          reference: note,
        },
      });
      return u;
    });

    res.json({ balance: updated.balance });
  } catch (err) {
    console.error("POST /admin/adjust-balance/:userId error:", err);
    res.status(500).json({ error: "Failed to adjust balance" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /admin/users/:userId — hard delete user and all data
// ---------------------------------------------------------------------------
adminRouter.delete("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (isOwner(user.username)) {
      return res.status(403).json({ error: "Cannot delete the admin account" });
    }

    await prisma.$transaction([
      prisma.rakebackClaim.deleteMany({ where: { userId } }),
      prisma.seedRotation.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.bet.deleteMany({ where: { userId } }),
      prisma.friendRequest.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } }),
      prisma.friendship.deleteMany({ where: { OR: [{ userId }, { friendId: userId }] } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /admin/users/:userId error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------------------------------------------------------------------------
// GET /bank — house bank balance + P&L
// ---------------------------------------------------------------------------
adminRouter.get("/bank", async (_req, res) => {
  try {
    const bank = await prisma.houseBank.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", chips: 1000000000, dollars: 1000000000 },
      update: {},
    });

    const betAgg = await prisma.bet.aggregate({ _sum: { amount: true, payout: true } });
    const totalWagered = betAgg._sum.amount ?? 0;
    const totalPaidOut = betAgg._sum.payout ?? 0;
    const houseIncome = totalWagered - totalPaidOut;

    const transactions = await prisma.houseBankTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({
      chips: bank.chips,
      dollars: bank.dollars,
      houseIncome,
      totalWagered,
      totalPaidOut,
      transactions,
    });
  } catch (err) {
    console.error("GET /admin/bank error:", err);
    res.status(500).json({ error: "Failed to load bank" });
  }
});

// ---------------------------------------------------------------------------
// POST /bank/adjust — add/remove chips or dollars from house bank
// ---------------------------------------------------------------------------
const bankAdjustSchema = z.object({
  type: z.enum(["chips", "dollars"]),
  amount: z.number().int(),
  note: z.string().min(1),
});

adminRouter.post("/bank/adjust", async (req, res) => {
  const parsed = bankAdjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { type, amount, note } = parsed.data;

  try {
    const updateData = type === "chips" ? { chips: { increment: amount } } : { dollars: { increment: amount } };
    const bank = await prisma.houseBank.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", chips: type === "chips" ? 1000000000 + amount : 1000000000, dollars: type === "dollars" ? 1000000000 + amount : 1000000000 },
      update: updateData,
    });

    await prisma.houseBankTransaction.create({
      data: {
        type: amount >= 0 ? `${type}_add` : `${type}_remove`,
        chipsChange: type === "chips" ? amount : 0,
        dollarsChange: type === "dollars" ? amount : 0,
        note,
      },
    });

    res.json({ chips: bank.chips, dollars: bank.dollars });
  } catch (err) {
    console.error("POST /admin/bank/adjust error:", err);
    res.status(500).json({ error: "Failed to adjust bank" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /users/:userId/rank — set a user's rank
// ---------------------------------------------------------------------------
const rankSchema = z.object({
  rank: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]),
});

adminRouter.patch("/users/:userId/rank", async (req, res) => {
  const parsed = rankSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (isOwner(user.username)) return res.status(400).json({ error: "Cannot change owner rank" });

    const updated = await prisma.user.update({ where: { id: userId }, data: { rank: parsed.data.rank } });
    res.json({ rank: updated.rank });
  } catch (err) {
    console.error("PATCH /admin/users/:userId/rank error:", err);
    res.status(500).json({ error: "Failed to update rank" });
  }
});
