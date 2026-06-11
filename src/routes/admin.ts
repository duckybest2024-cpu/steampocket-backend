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

// ── Feature 1 & 2: per-game stats + revenue chart ──────────────────────────

adminRouter.get("/stats/games", async (_req, res) => {
  try {
    const grouped = await prisma.bet.groupBy({
      by: ["game"],
      _sum: { amount: true, payout: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    });
    res.json({
      games: grouped.map((g) => ({
        game: g.game,
        wagered: g._sum.amount ?? 0,
        paidOut: g._sum.payout ?? 0,
        bets: g._count._all,
        edge: g._sum.amount
          ? (((g._sum.amount - (g._sum.payout ?? 0)) / g._sum.amount) * 100).toFixed(2)
          : "0.00",
      })),
    });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

adminRouter.get("/stats/revenue", async (_req, res) => {
  try {
    const days = 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const bets = await prisma.bet.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, payout: true, createdAt: true },
    });
    const dailyMap: Record<string, { wagered: number; paidOut: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      dailyMap[d.toISOString().slice(0, 10)] = { wagered: 0, paidOut: 0 };
    }
    for (const bet of bets) {
      const key = bet.createdAt.toISOString().slice(0, 10);
      if (dailyMap[key]) { dailyMap[key].wagered += bet.amount; dailyMap[key].paidOut += bet.payout; }
    }
    res.json({ days: Object.entries(dailyMap).map(([date, { wagered, paidOut }]) => ({ date, wagered, paidOut, profit: wagered - paidOut })) });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 3: active users ─────────────────────────────────────────────────

adminRouter.get("/stats/active", async (_req, res) => {
  try {
    const [h24, d7, d30] = await Promise.all([
      prisma.bet.groupBy({ by: ["userId"], where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.bet.groupBy({ by: ["userId"], where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.bet.groupBy({ by: ["userId"], where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    ]);
    res.json({ last24h: h24.length, last7d: d7.length, last30d: d30.length });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 4: user detail ──────────────────────────────────────────────────

adminRouter.get("/users/:id/detail", async (req, res) => {
  try {
    const { id } = req.params;
    const [user, bets, txs, nfts] = await Promise.all([
      prisma.user.findUnique({ where: { id }, include: { _count: { select: { bets: true, nfts: true } } } }),
      prisma.bet.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.transaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.nft.findMany({ where: { ownerId: id }, orderBy: { mintedAt: "desc" }, take: 20 }),
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user, bets, txs, nfts });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 5: zero balance ─────────────────────────────────────────────────

adminRouter.post("/users/:id/zero-balance", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "Not found" });
    const delta = -user.balance;
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data: { balance: 0 } });
      if (delta !== 0) await tx.transaction.create({ data: { userId: id, type: "admin_zero", amount: delta, balance: 0, reference: "admin zero balance" } });
      return u;
    });
    res.json({ balance: updated.balance });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 6: recent bets feed ─────────────────────────────────────────────

adminRouter.get("/bets", async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const bets = await prisma.bet.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { username: true } } },
    });
    res.json({ bets });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 7: payment history ──────────────────────────────────────────────

adminRouter.get("/payments", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 50;
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { type: { in: ["deposit", "withdrawal", "promo"] } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { username: true } } },
      }),
      prisma.transaction.count({ where: { type: { in: ["deposit", "withdrawal", "promo"] } } }),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Feature 8 & 9: top players ──────────────────────────────────────────────

adminRouter.get("/top-players", async (_req, res) => {
  try {
    const grouped = await prisma.bet.groupBy({
      by: ["userId"],
      _sum: { amount: true, payout: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    });
    const userList = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, username: true, level: true },
    });
    const userMap = new Map(userList.map((u) => [u.id, u]));
    res.json({
      players: grouped.map((g) => ({
        username: userMap.get(g.userId)?.username ?? "unknown",
        level: userMap.get(g.userId)?.level ?? 1,
        wagered: g._sum.amount ?? 0,
        paidOut: g._sum.payout ?? 0,
        profit: (g._sum.payout ?? 0) - (g._sum.amount ?? 0),
        bets: g._count._all,
      })),
    });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Features 10 & 11: broadcasts ────────────────────────────────────────────

adminRouter.get("/broadcasts", async (_req, res) => {
  const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ broadcasts });
});

adminRouter.post("/broadcast", async (req, res) => {
  const { message, type = "info" } = req.body as { message?: string; type?: string };
  if (!message) return res.status(400).json({ error: "Message required" });
  const b = await prisma.broadcast.create({ data: { message, type } });
  res.json({ broadcast: b });
});

adminRouter.delete("/broadcasts/:id", async (req, res) => {
  try {
    await prisma.broadcast.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch { res.status(404).json({ error: "Not found" }); }
});

// ── Features 12, 13, 14: promo codes ────────────────────────────────────────

adminRouter.get("/promos", async (_req, res) => {
  const promos = await prisma.promoCode.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ promos });
});

adminRouter.post("/promos", async (req, res) => {
  const { code, chips, maxUses = 1, expiresAt } = req.body as { code?: string; chips?: number; maxUses?: number; expiresAt?: string };
  if (!code || !chips) return res.status(400).json({ error: "code and chips required" });
  try {
    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase().trim(),
        chips: Math.round(Number(chips) * 100),
        maxUses: Number(maxUses) || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    res.json({ promo });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Code already exists" });
    res.status(500).json({ error: "Failed to create promo code" });
  }
});

adminRouter.delete("/promos/:id", async (req, res) => {
  try {
    await prisma.promoCode.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ ok: true });
  } catch { res.status(404).json({ error: "Not found" }); }
});

// ── Features 15 & 16: game controls + maintenance ───────────────────────────

adminRouter.get("/config", async (_req, res) => {
  const configs = await prisma.siteConfig.findMany();
  const obj: Record<string, string> = {};
  for (const c of configs) obj[c.key] = c.value;
  res.json(obj);
});

adminRouter.post("/config", async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await prisma.siteConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  res.json({ ok: true });
});

// ── Feature 17: bulk chip giveaway ──────────────────────────────────────────

adminRouter.post("/bulk-chips", async (req, res) => {
  const { chips, note = "bulk giveaway" } = req.body as { chips?: number; note?: string };
  if (!chips || Number(chips) <= 0) return res.status(400).json({ error: "chips must be > 0" });
  const chipsInCents = Math.round(Number(chips) * 100);
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let count = 0;
    for (const u of users) {
      const updated = await prisma.user.update({ where: { id: u.id }, data: { balance: { increment: chipsInCents } } });
      await prisma.transaction.create({ data: { userId: u.id, type: "admin_bonus", amount: chipsInCents, balance: updated.balance, reference: note } });
      count++;
    }
    res.json({ count, chipsEach: Number(chips) });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ── Features 18: site settings (starting balance) are stored in SiteConfig
// (already covered by GET/POST /admin/config above)

// ── Features 19 & 20: NFT management ────────────────────────────────────────

adminRouter.get("/nfts", async (_req, res) => {
  try {
    const nfts = await prisma.nft.findMany({
      orderBy: { mintedAt: "desc" },
      take: 100,
      include: { owner: { select: { username: true } } },
    });
    res.json({ nfts });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

adminRouter.post("/nft/mint", async (req, res) => {
  const { username, name, description = "", rarity = "common", category = "special", emoji = "⭐" } = req.body as { username?: string; name?: string; description?: string; rarity?: string; category?: string; emoji?: string };
  if (!username || !name) return res.status(400).json({ error: "username and name required" });
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const nft = await prisma.nft.create({ data: { ownerId: user.id, name, description: description || name, rarity, category, emoji } });
    res.json({ nft });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

adminRouter.delete("/nft/:id", async (req, res) => {
  try {
    await prisma.tradeOfferItem.deleteMany({ where: { nftId: req.params.id } });
    await prisma.nft.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch { res.status(404).json({ error: "Not found" }); }
});
