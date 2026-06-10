import { floatsFromSeed } from "../lib/provablyFair";

export type PlinkoRisk = "low" | "medium" | "high";
export const PLINKO_ROW_OPTIONS = [8, 10, 12, 14, 16] as const;
export type PlinkoRows = (typeof PLINKO_ROW_OPTIONS)[number];

/**
 * Multiplier tables keyed by [risk][rows]. Slot count = rows + 1, symmetric around the centre.
 * Values follow the familiar shape: low risk hugs 1x in the middle with mild edges,
 * high risk pays near-zero in the centre and explosive multipliers at the rails —
 * both are tuned so the binomial-weighted expectation lands close to 99% RTP.
 */
const TABLES: Record<PlinkoRisk, Partial<Record<PlinkoRows, number[]>>> = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    14: [15, 4, 1.9, 1.4, 1.1, 1, 0.7, 0.5, 0.7, 1, 1.1, 1.4, 1.9, 4, 15],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [10, 2.5, 1.2, 0.7, 0.6, 0.7, 1.2, 2.5, 10],
    10: [18, 4.5, 1.8, 1.2, 0.7, 0.5, 0.7, 1.2, 1.8, 4.5, 18],
    12: [22, 9, 3.5, 1.7, 1.1, 0.6, 0.5, 0.6, 1.1, 1.7, 3.5, 9, 22],
    14: [45, 12, 6, 3.5, 1.9, 1, 0.5, 0.4, 0.5, 1, 1.9, 3.5, 6, 12, 45],
    16: [85, 30, 9, 4.5, 2.8, 1.5, 1, 0.5, 0.4, 0.5, 1, 1.5, 2.8, 4.5, 9, 30, 85],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    14: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

export function multiplierTable(risk: PlinkoRisk, rows: PlinkoRows): number[] {
  const table = TABLES[risk]?.[rows];
  if (!table) throw new Error(`No multiplier table for risk=${risk} rows=${rows}`);
  return table;
}

export interface PlinkoOutcome {
  path: (0 | 1)[]; // 0 = left, 1 = right at each peg row
  slot: number; // landing index, 0..rows
  multiplier: number;
}

/**
 * Drop the ball through `rows` pegs. Each peg is an independent 50/50 coin flip
 * derived from the seed stream; the final slot is simply the count of "right" bounces
 * (a binomial distribution — exactly how a real Galton board behaves).
 */
export function dropBall(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  risk: PlinkoRisk,
  rows: PlinkoRows
): PlinkoOutcome {
  const floats = floatsFromSeed(serverSeed, clientSeed, nonce, rows);
  const path = floats.map((f) => (f < 0.5 ? 0 : 1)) as (0 | 1)[];
  const slot = path.reduce<number>((sum, bounce) => sum + bounce, 0);
  const table = multiplierTable(risk, rows);
  return { path, slot, multiplier: table[slot] };
}

export function validatePlinko(risk: string, rows: number): string | null {
  if (risk !== "low" && risk !== "medium" && risk !== "high") return "risk must be 'low', 'medium', or 'high'";
  if (!PLINKO_ROW_OPTIONS.includes(rows as PlinkoRows)) {
    return `rows must be one of ${PLINKO_ROW_OPTIONS.join(", ")}`;
  }
  return null;
}
