import { floatsFromSeed } from "../lib/provablyFair";
import { config } from "../lib/config";

export const GRID_SIZE = 25;
export const MIN_MINES = 1;
export const MAX_MINES = 24;

export interface MinesRoundState {
  mineCount: number;
  mines: number[]; // tile indices 0-24 — only revealed to the client once the round ends
  revealed: number[]; // tiles the player has safely opened, in order
  status: "active" | "busted" | "cashed_out";
  currentMultiplier: number;
}

/** Lay mines deterministically from the seed stream via a partial Fisher-Yates. */
export function layMines(serverSeed: string, clientSeed: string, nonce: number, mineCount: number): number[] {
  const tiles = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const floats = floatsFromSeed(serverSeed, clientSeed, nonce, GRID_SIZE);
  for (let i = GRID_SIZE - 1; i > 0; i--) {
    const j = Math.floor(floats[GRID_SIZE - 1 - i] * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.slice(0, mineCount).sort((a, b) => a - b);
}

/**
 * Multiplier after `picks` safe reveals out of `GRID_SIZE` tiles containing `mineCount` mines.
 * This is the classic hypergeometric "fair odds" formula:
 *
 *   product over k=0..picks-1 of  (GRID_SIZE - k) / (GRID_SIZE - mineCount - k)
 *
 * which is the reciprocal of the probability of surviving `picks` consecutive reveals,
 * then trimmed by the house edge for ~99% RTP.
 */
export function multiplierForPicks(mineCount: number, picks: number): number {
  if (picks <= 0) return 1;
  let fairMultiplier = 1;
  for (let k = 0; k < picks; k++) {
    fairMultiplier *= (GRID_SIZE - k) / (GRID_SIZE - mineCount - k);
  }
  return Number((fairMultiplier * (1 - config.houseEdge)).toFixed(4));
}

export function validateMineCount(mineCount: number): string | null {
  if (!Number.isInteger(mineCount) || mineCount < MIN_MINES || mineCount > MAX_MINES) {
    return `mineCount must be an integer between ${MIN_MINES} and ${MAX_MINES}`;
  }
  return null;
}

export function validateTile(tile: number): string | null {
  if (!Number.isInteger(tile) || tile < 0 || tile >= GRID_SIZE) {
    return `tile must be an integer between 0 and ${GRID_SIZE - 1}`;
  }
  return null;
}
