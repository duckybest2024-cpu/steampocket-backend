import { floatFromSeed } from "../lib/provablyFair";
import { config } from "../lib/config";

export interface LimboParams {
  targetMultiplier: number; // e.g. 2.00 — player wins if the rolled multiplier >= this
}

export interface LimboOutcome {
  crashAt: number; // the multiplier the round "busts" at
  win: boolean;
  multiplier: number;
}

const MIN_TARGET = 1.01;
const MAX_TARGET = 1_000_000;

export function validateLimbo({ targetMultiplier }: LimboParams): string | null {
  if (!Number.isFinite(targetMultiplier) || targetMultiplier < MIN_TARGET || targetMultiplier > MAX_TARGET) {
    return `targetMultiplier must be between ${MIN_TARGET} and ${MAX_TARGET}`;
  }
  return null;
}

/**
 * Shared crash-curve generator (also used by the live Crash game).
 * Maps a uniform float to a multiplier with a long right tail and a built-in
 * "instant bust" floor, then trims the result by the house edge so the
 * expected payout converges to ~99% RTP.
 *
 *   float in [0, houseEdge)   -> instant bust at 1.00x
 *   float in [houseEdge, 1)   -> 1 / (1 - float), house-edge adjusted
 */
export function multiplierFromFloat(float: number, houseEdge = config.houseEdge): number {
  if (float < houseEdge) return 1.0;
  const raw = (1 - houseEdge) / (1 - float);
  return Math.max(1.0, Number(raw.toFixed(2)));
}

export function playLimbo(serverSeed: string, clientSeed: string, nonce: number, params: LimboParams): LimboOutcome {
  const float = floatFromSeed(serverSeed, clientSeed, nonce);
  const crashAt = multiplierFromFloat(float);
  const win = crashAt >= params.targetMultiplier;
  const multiplier = win ? Number(params.targetMultiplier.toFixed(4)) : 0;

  return { crashAt, win, multiplier };
}
