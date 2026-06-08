import { floatsFromSeed } from "../lib/provablyFair";

export const REELS = 5;
export const ROWS = 3;

export type Symbol =
  | "wild" // substitutes for any paying symbol, doubles the line win
  | "scatter" // pays anywhere, 3+ trigger free spins
  | "crown"
  | "gem"
  | "bell"
  | "clover"
  | "horseshoe"
  | "ace"
  | "king"
  | "queen";

/** Reel strips — one weighted array per physical reel. Longer strips & repeats bias frequency without
 *  needing a separate lookup table; this mirrors how real slot reel-strips encode probability. */
const REEL_STRIPS: Symbol[][] = [
  buildStrip({ wild: 2, scatter: 2, crown: 4, gem: 6, bell: 8, clover: 9, horseshoe: 10, ace: 12, king: 12, queen: 13 }),
  buildStrip({ wild: 2, scatter: 2, crown: 4, gem: 6, bell: 8, clover: 9, horseshoe: 10, ace: 12, king: 12, queen: 13 }),
  buildStrip({ wild: 2, scatter: 2, crown: 5, gem: 6, bell: 8, clover: 9, horseshoe: 10, ace: 11, king: 12, queen: 13 }),
  buildStrip({ wild: 2, scatter: 2, crown: 4, gem: 6, bell: 8, clover: 9, horseshoe: 10, ace: 12, king: 12, queen: 13 }),
  buildStrip({ wild: 2, scatter: 2, crown: 4, gem: 6, bell: 8, clover: 9, horseshoe: 10, ace: 12, king: 12, queen: 13 }),
];

function buildStrip(weights: Record<Symbol, number>): Symbol[] {
  const strip: Symbol[] = [];
  for (const [symbol, count] of Object.entries(weights) as [Symbol, number][]) {
    for (let i = 0; i < count; i++) strip.push(symbol);
  }
  return strip;
}

/** Pay table: multiplier of the *line bet* for 3/4/5-of-a-kind. Scatter pays on total bet instead. */
const PAYTABLE: Partial<Record<Symbol, [number, number, number]>> = {
  crown: [10, 40, 200],
  gem: [5, 20, 100],
  bell: [4, 15, 75],
  clover: [3, 12, 60],
  horseshoe: [2.5, 10, 50],
  ace: [2, 8, 40],
  king: [1.5, 6, 30],
  queen: [1, 5, 25],
};
const SCATTER_PAYOUT: Record<number, number> = { 3: 5, 4: 25, 5: 100 };

/** 25 fixed paylines across a 5x3 grid — rows are 0 (top) / 1 (middle) / 2 (bottom) per reel. */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2],
  [1, 0, 2, 0, 1],
  [1, 2, 0, 2, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
];

export type Grid = Symbol[][]; // grid[reel][row]

export function spinGrid(serverSeed: string, clientSeed: string, nonce: number, cursor = 0): Grid {
  const floats = floatsFromSeed(serverSeed, clientSeed, nonce, REELS * ROWS, cursor);
  const grid: Grid = [];
  for (let reel = 0; reel < REELS; reel++) {
    const strip = REEL_STRIPS[reel];
    const column: Symbol[] = [];
    for (let row = 0; row < ROWS; row++) {
      const float = floats[reel * ROWS + row];
      column.push(strip[Math.floor(float * strip.length)]);
    }
    grid.push(column);
  }
  return grid;
}

export interface LineWin {
  line: number; // index into PAYLINES
  symbol: Symbol;
  count: number;
  payout: number; // in line-bet units (already wild-doubled if applicable)
}

export interface SpinResult {
  grid: Grid;
  lineWins: LineWin[];
  scatterCount: number;
  scatterPayout: number; // in total-bet units
  totalWinUnits: number; // combined payout, expressed in *line bet* units (scatter converted)
  freeSpinsAwarded: number;
}

/** Evaluate every payline left-to-right, allowing wilds to substitute, doubling the win per wild involved. */
export function evaluateSpin(grid: Grid, linesPlayed: number): SpinResult {
  const lineWins: LineWin[] = [];

  for (let lineIndex = 0; lineIndex < linesPlayed; lineIndex++) {
    const positions = PAYLINES[lineIndex];
    const symbolsOnLine = positions.map((row, reel) => grid[reel][row]);

    const baseSymbol = symbolsOnLine.find((s) => s !== "wild" && s !== "scatter");
    if (!baseSymbol || !PAYTABLE[baseSymbol]) continue;

    let count = 0;
    let wildsUsed = 0;
    for (const symbol of symbolsOnLine) {
      if (symbol === baseSymbol || symbol === "wild") {
        count += 1;
        if (symbol === "wild") wildsUsed += 1;
      } else {
        break;
      }
    }

    if (count >= 3) {
      const tierIndex = Math.min(count, 5) - 3;
      const basePayout = PAYTABLE[baseSymbol]![tierIndex];
      const payout = basePayout * Math.pow(2, wildsUsed); // each wild in the combo doubles the win
      lineWins.push({ line: lineIndex, symbol: baseSymbol, count, payout });
    }
  }

  let scatterCount = 0;
  for (const column of grid) for (const symbol of column) if (symbol === "scatter") scatterCount += 1;

  const scatterPayout = SCATTER_PAYOUT[scatterCount] ?? 0;
  const freeSpinsAwarded = scatterCount >= 3 ? 10 : 0;

  const lineTotal = lineWins.reduce((sum, w) => sum + w.payout, 0);

  return {
    grid,
    lineWins,
    scatterCount,
    scatterPayout,
    totalWinUnits: lineTotal,
    freeSpinsAwarded,
  };
}

export const MIN_LINES = 1;
export const MAX_LINES = PAYLINES.length;

export function validateSlotsBet(lines: number): string | null {
  if (!Number.isInteger(lines) || lines < MIN_LINES || lines > MAX_LINES) {
    return `lines must be an integer between ${MIN_LINES} and ${MAX_LINES}`;
  }
  return null;
}
