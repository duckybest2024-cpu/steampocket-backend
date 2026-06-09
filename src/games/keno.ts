import { floatsFromSeed } from "../lib/provablyFair";

export const KENO_POOL = 80;
export const KENO_DRAW = 20;
export const MIN_PICKS = 2;
export const MAX_PICKS = 10;

/** Maps spots -> (matches -> multiplier). Only entries with a positive multiplier are stored. */
const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  2:  { 2: 11 },
  3:  { 2: 2,  3: 26 },
  4:  { 2: 1,  3: 4,   4: 55 },
  5:  {        3: 2,   4: 11,   5: 90 },
  6:  {        3: 1,   4: 5,    5: 30,   6: 450 },
  7:  {        4: 3,   5: 15,   6: 80,   7: 650 },
  8:  {        4: 2,   5: 8,    6: 40,   7: 250,   8: 1800 },
  9:  {        4: 1,   5: 5,    6: 18,   7: 70,    8: 500,  9: 2800 },
  10: {        5: 4,   6: 13,   7: 35,   8: 120,   9: 800, 10: 4000 },
};

export interface KenoResult {
  picks: number[];
  drawn: number[];
  hits: number[];
  hitCount: number;
  multiplier: number;
}

/**
 * Draw 20 numbers from 1-80 using a partial Fisher-Yates shuffle driven by floatsFromSeed.
 * This mirrors how mines.ts lays out its grid — the same provably-fair approach.
 */
export function drawKeno(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const pool = Array.from({ length: KENO_POOL }, (_, i) => i + 1); // 1..80
  const floats = floatsFromSeed(serverSeed, clientSeed, nonce, KENO_DRAW);
  // Partial Fisher-Yates: we only need the last DRAW elements of a full shuffle
  for (let i = KENO_POOL - 1; i >= KENO_POOL - KENO_DRAW; i--) {
    const floatIndex = KENO_POOL - 1 - i; // 0-based index into floats array
    const j = Math.floor(floats[floatIndex] * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // The last DRAW elements are the drawn numbers
  return pool.slice(KENO_POOL - KENO_DRAW).sort((a, b) => a - b);
}

export function kenoMultiplier(spots: number, hitCount: number): number {
  const table = PAYOUT_TABLE[spots];
  if (!table) return 0;
  return table[hitCount] ?? 0;
}

export function playKeno(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  picks: number[]
): KenoResult {
  const drawn = drawKeno(serverSeed, clientSeed, nonce);
  const drawnSet = new Set(drawn);
  const hits = picks.filter((p) => drawnSet.has(p)).sort((a, b) => a - b);
  const hitCount = hits.length;
  const multiplier = kenoMultiplier(picks.length, hitCount);

  return { picks, drawn, hits, hitCount, multiplier };
}

export function validateKeno(picks: number[]): string | null {
  if (!Array.isArray(picks) || picks.length < MIN_PICKS || picks.length > MAX_PICKS) {
    return `picks must be an array of ${MIN_PICKS}-${MAX_PICKS} numbers`;
  }
  for (const p of picks) {
    if (!Number.isInteger(p) || p < 1 || p > KENO_POOL) {
      return `each pick must be an integer between 1 and ${KENO_POOL}`;
    }
  }
  if (new Set(picks).size !== picks.length) {
    return "picks must be unique";
  }
  return null;
}
