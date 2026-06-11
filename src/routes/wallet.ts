import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { applyLedgerEntry, updateHouseChips, InsufficientFundsError } from "../lib/wallet";
import { getStripe, CHIP_PACKAGES } from "../lib/stripe";

export const walletRouter = Router();

walletRouter.get("/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where: { userId: req.userId! } }),
  ]);

  res.json({ items, page, pageSize, total });
});

const faucetSchema = z.object({ amount: z.number().int().min(100).max(1_000_000) });

/**
 * Play-money faucet — lets a player top up their demo balance directly (no real payment rails here).
 * Capped per request and rate-limited implicitly by requiring the balance to be below a threshold,
 * so it tops up rather than becoming an infinite-money cheat.
 */
walletRouter.post("/faucet", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = faucetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  if (user.balance > 50_000) {
    return res.status(429).json({ error: "Faucet only available below a $500 balance" });
  }

  const updated = await applyLedgerEntry(prisma, user.id, "deposit", parsed.data.amount, "faucet_topup");
  res.json({ balance: updated.balance });
});

// ---------------------------------------------------------------------------
// Emergency free chips — 20 chips when balance ≤ 10 chips, once per 24 hours
// ---------------------------------------------------------------------------

walletRouter.post("/free-chips", requireAuth as any, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.balance > 1_000) {
      return res.status(400).json({ error: "Free chips are only available when you have 10 chips or fewer" });
    }

    const recent = await prisma.transaction.findFirst({
      where: { userId, type: "free_chips", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recent) {
      const retryMs = 24 * 60 * 60 * 1000 - (Date.now() - recent.createdAt.getTime());
      const retryHours = Math.ceil(retryMs / (60 * 60 * 1000));
      return res.status(429).json({ error: `Come back in ~${retryHours}h for another free chip claim` });
    }

    const updated = await applyLedgerEntry(prisma, userId, "free_chips", 2_000, "emergency_chips");
    res.json({ balance: updated.balance, awarded: 2_000 });
  } catch (err) {
    console.error("Free chips error:", err);
    res.status(500).json({ error: "Failed to award free chips" });
  }
});

// ---------------------------------------------------------------------------
// Stripe checkout — create a hosted payment session for a chip package
// ---------------------------------------------------------------------------

const checkoutSchema = z.object({ packageId: z.string() });

walletRouter.post("/create-checkout-session", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        error: "Payment not configured. Add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const pkg = CHIP_PACKAGES.find((p) => p.id === parsed.data.packageId);
    if (!pkg) return res.status(400).json({ error: "Invalid package" });

    const origin = `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pkg.name} — ${pkg.chips} chips`,
              description: `${pkg.chips.toLocaleString()} Casino Aurelius chips (play money). Use test card 4242 4242 4242 4242.`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: {
        userId: req.userId!,
        packageId: pkg.id,
        chips: String(pkg.chips),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session — please try again" });
  }
});

// ---------------------------------------------------------------------------
// Chip system: cash out chips to bank, buy chips from bank
// ---------------------------------------------------------------------------

const buyChipsSchema = z.object({ amount: z.number().int().min(100) });

walletRouter.post("/buy-chips", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = buyChipsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const userId = req.userId!;
    const { amount } = parsed.data;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.bank < amount) return res.status(400).json({ error: "Not enough chips in your bank" });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { bank: { decrement: amount }, balance: { increment: amount } },
      });
      await tx.transaction.create({
        data: { userId, type: "deposit", amount, balance: u.balance, reference: "buy_chips" },
      });
      return u;
    });

    // Moving from player bank → playing chips: house loses chips, gains dollars
    await updateHouseChips(prisma, -amount, amount).catch(() => {});

    res.json({ balance: updated.balance, bank: updated.bank });
  } catch (err) {
    console.error("Buy chips error:", err);
    res.status(500).json({ error: "Transaction failed — please try again" });
  }
});

walletRouter.post("/cashout-chips", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.balance <= 0) return res.status(400).json({ error: "No chips to cash out" });

    const amount = user.balance;
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { balance: 0, bank: { increment: amount } },
      });
      await tx.transaction.create({
        data: { userId, type: "withdrawal", amount: -amount, balance: 0, reference: "cashout_chips" },
      });
      return u;
    });

    // Moving from playing chips → player bank: house gains chips, loses dollars
    await updateHouseChips(prisma, amount, -amount).catch(() => {});

    res.json({ balance: updated.balance, bank: updated.bank, cashedOut: amount });
  } catch (err) {
    console.error("Cashout chips error:", err);
    res.status(500).json({ error: "Transaction failed — please try again" });
  }
});

/** Daily rakeback: 5% of cumulative wagers since the last claim, paid as a flat bonus. */
walletRouter.post("/rakeback/claim", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const lastClaim = await prisma.rakebackClaim.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const since = lastClaim?.createdAt ?? new Date(0);

  const dayMs = 24 * 60 * 60 * 1000;
  if (lastClaim && Date.now() - lastClaim.createdAt.getTime() < dayMs) {
    const retryAfterMs = dayMs - (Date.now() - lastClaim.createdAt.getTime());
    return res.status(429).json({ error: "Rakeback can be claimed once every 24 hours", retryAfterMs });
  }

  const wagered = await prisma.bet.aggregate({
    where: { userId, createdAt: { gt: since } },
    _sum: { amount: true },
  });
  const totalWagered = wagered._sum.amount ?? 0;
  const rakeback = Math.floor(totalWagered * 0.05);

  if (rakeback <= 0) return res.status(400).json({ error: "No eligible wagers since your last claim" });

  const claim = await prisma.rakebackClaim.create({ data: { userId, amount: rakeback } });
  const updated = await applyLedgerEntry(prisma, userId, "rakeback", rakeback, claim.id);

  res.json({ claimed: rakeback, balance: updated.balance });
});

/** Top wagered / top won leaderboards over a rolling 7-day window. */
walletRouter.get("/leaderboard", async (req, res) => {
  const metric = req.query.metric === "profit" ? "profit" : "wagered";
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.bet.groupBy({
    by: ["userId"],
    where: { createdAt: { gt: since } },
    _sum: { amount: true, payout: true },
    _count: { _all: true },
  });

  const ranked = grouped
    .map((row) => ({
      userId: row.userId,
      wagered: row._sum.amount ?? 0,
      won: row._sum.payout ?? 0,
      profit: (row._sum.payout ?? 0) - (row._sum.amount ?? 0),
      bets: row._count._all,
    }))
    .sort((a, b) => (metric === "profit" ? b.profit - a.profit : b.wagered - a.wagered))
    .slice(0, 20);

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, username: true, level: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json({
    metric,
    windowDays: 7,
    leaderboard: ranked.map((r, i) => ({
      rank: i + 1,
      username: userMap.get(r.userId)?.username ?? "unknown",
      level: userMap.get(r.userId)?.level ?? 1,
      ...r,
      userId: undefined,
    })),
  });
});

walletRouter.use((err: unknown, _req: unknown, res: import("express").Response, next: import("express").NextFunction) => {
  if (err instanceof InsufficientFundsError) return res.status(400).json({ error: err.message });
  next(err);
});
