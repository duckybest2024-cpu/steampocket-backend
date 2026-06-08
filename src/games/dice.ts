import { floatFromSeed } from "../lib/provablyFair";
import { config } from "../lib/config";

export type DiceDirection = "over" | "under";

export interface DiceParams {
  target: number; // 0.01 - 99.99
  direction: DiceDirection;
}

export interface DiceOutcome {
  roll: number; // 0.00 - 99.99
  win: boolean;
  multiplier: number;
  winChance: number;
}

const MIN_TARGET = 0.01;
const MAX_TARGET = 99.99;

export function validateDice({ target, direction }: DiceParams): string | null {
  if (!Number.isFinite(target) || target < MIN_TARGET || target > MAX_TARGET) {
    return `target must be between ${MIN_TARGET} and ${MAX_TARGET}`;
  }
  if (direction !== "over" && direction !== "under") return "direction must be 'over' or 'under'";
  return null;
}

/**
 * Roll: a uniform float in [0, 100), rounded to 2 decimals — classic dice-game feel.
 * Win chance is the proportion of the [0,100) range that satisfies the chosen direction,
 * and the fair multiplier is (100 / winChance) scaled down by the house edge (RTP ≈ 99%).
 */
export function playDice(serverSeed: string, clientSeed: string, nonce: number, params: DiceParams): DiceOutcome {
  const float = floatFromSeed(serverSeed, clientSeed, nonce);
  const roll = Math.floor(float * 10_000) / 100; // 0.00 - 99.99

  const winChance = params.direction === "over" ? 100 - params.target : params.target;
  const win = params.direction === "over" ? roll > params.target : roll < params.target;

  const fairMultiplier = 100 / winChance;
  const multiplier = win ? Number((fairMultiplier * (1 - config.houseEdge)).toFixed(4)) : 0;

  return { roll, win, multiplier, winChance };
}
