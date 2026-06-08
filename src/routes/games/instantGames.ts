import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../../middleware/auth";
import { placeBet, BadBetInputError } from "../../lib/betting";
import { playDice, validateDice } from "../../games/dice";
import { playLimbo, validateLimbo } from "../../games/limbo";
import { dropBall, validatePlinko, PlinkoRisk, PlinkoRows } from "../../games/plinko";
import { InsufficientFundsError } from "../../lib/wallet";

export const instantGamesRouter = Router();

/** Shared error translation so every instant-game route reports the same shape for the same failures. */
function handleBetError(err: unknown, res: import("express").Response) {
  if (err instanceof InsufficientFundsError) return res.status(400).json({ error: "Insufficient balance" });
  if (err instanceof BadBetInputError) return res.status(400).json({ error: err.message });
  throw err;
}

// ---------------------------------------------------------------------------
// Dice — pick over/under a target 0-100, instant resolution.
// ---------------------------------------------------------------------------
const diceSchema = z.object({
  amount: z.number().int().positive(),
  target: z.number().min(0.01).max(99.99),
  direction: z.enum(["over", "under"]),
});

instantGamesRouter.post("/dice", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = diceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { amount, target, direction } = parsed.data;
  const validation = validateDice({ target, direction });
  if (validation) return res.status(400).json({ error: validation });

  try {
    const placed = await placeBet(req.userId!, "dice", amount, (seeds) => {
      const outcome = playDice(seeds.serverSeed, seeds.clientSeed, seeds.nonce, { target, direction });
      return {
        payout: outcome.win ? Math.floor(amount * outcome.multiplier) : 0,
        multiplier: outcome.multiplier,
        result: outcome.win ? "win" : "loss",
        state: { target, direction, roll: outcome.roll, winChance: outcome.winChance },
      };
    });
    res.json(responsePayload(placed));
  } catch (err) {
    handleBetError(err, res);
  }
});

// ---------------------------------------------------------------------------
// Limbo — pick a target multiplier, win if the rolled multiplier clears it.
// ---------------------------------------------------------------------------
const limboSchema = z.object({
  amount: z.number().int().positive(),
  targetMultiplier: z.number().min(1.01).max(1_000_000),
});

instantGamesRouter.post("/limbo", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = limboSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { amount, targetMultiplier } = parsed.data;
  const validation = validateLimbo({ targetMultiplier });
  if (validation) return res.status(400).json({ error: validation });

  try {
    const placed = await placeBet(req.userId!, "limbo", amount, (seeds) => {
      const outcome = playLimbo(seeds.serverSeed, seeds.clientSeed, seeds.nonce, { targetMultiplier });
      return {
        payout: outcome.win ? Math.floor(amount * outcome.multiplier) : 0,
        multiplier: outcome.multiplier,
        result: outcome.win ? "win" : "loss",
        state: { targetMultiplier, crashAt: outcome.crashAt },
      };
    });
    res.json(responsePayload(placed));
  } catch (err) {
    handleBetError(err, res);
  }
});

// ---------------------------------------------------------------------------
// Plinko — drop a ball through a peg board, land in a multiplier slot.
// ---------------------------------------------------------------------------
const plinkoSchema = z.object({
  amount: z.number().int().positive(),
  risk: z.enum(["low", "medium", "high"]),
  rows: z.number().int(),
});

instantGamesRouter.post("/plinko", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = plinkoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { amount, risk, rows } = parsed.data;
  const validation = validatePlinko(risk, rows);
  if (validation) return res.status(400).json({ error: validation });

  try {
    const placed = await placeBet(req.userId!, "plinko", amount, (seeds) => {
      const outcome = dropBall(seeds.serverSeed, seeds.clientSeed, seeds.nonce, risk as PlinkoRisk, rows as PlinkoRows);
      const payout = Math.floor(amount * outcome.multiplier);
      return {
        payout,
        multiplier: outcome.multiplier,
        result: payout > amount ? "win" : "loss",
        state: { risk, rows, path: outcome.path, slot: outcome.slot },
      };
    });
    res.json(responsePayload(placed));
  } catch (err) {
    handleBetError(err, res);
  }
});

function responsePayload(placed: Awaited<ReturnType<typeof placeBet>>) {
  return {
    bet: placed.bet,
    balance: placed.balance,
    level: placed.level,
    xp: placed.xp,
    leveledUp: placed.leveledUp,
    nextNonce: placed.nonce + 1,
    result: placed.resolution,
  };
}
