import { floatFromSeed } from "../lib/provablyFair";

/** European single-zero wheel. Index = pocket number, value = colour. */
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteColor = "red" | "black" | "green";

export function colorOf(n: number): RouletteColor {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export type RouletteBetType =
  | "straight" // single number, pays 35:1
  | "split" // two adjacent numbers, pays 17:1
  | "street" // row of three, pays 11:1
  | "corner" // four numbers, pays 8:1
  | "line" // six numbers (two rows), pays 5:1
  | "dozen" // 1-12 / 13-24 / 25-36, pays 2:1
  | "column" // one of three vertical columns, pays 2:1
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low" // 1-18, pays 1:1
  | "high"; // 19-36, pays 1:1

export interface RouletteBet {
  type: RouletteBetType;
  numbers: number[]; // the pocket numbers this bet covers (computed/validated server-side)
  amount: number;
}

const PAYOUTS: Record<RouletteBetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
};

const EXPECTED_COUNT: Record<RouletteBetType, number> = {
  straight: 1,
  split: 2,
  street: 3,
  corner: 4,
  line: 6,
  dozen: 12,
  column: 12,
  red: 18,
  black: 18,
  even: 18,
  odd: 18,
  low: 18,
  high: 18,
};

/** Validate a single bet's shape — that its `numbers` are in range, unique, and the right count for its type. */
export function validateRouletteBet(bet: RouletteBet): string | null {
  if (!(bet.type in PAYOUTS)) return `unknown bet type '${bet.type}'`;
  if (!Number.isFinite(bet.amount) || bet.amount <= 0) return "bet amount must be positive";

  const requiresExplicitNumbers = ["straight", "split", "street", "corner", "line"].includes(bet.type);
  if (requiresExplicitNumbers) {
    const unique = new Set(bet.numbers);
    if (unique.size !== bet.numbers.length || bet.numbers.length !== EXPECTED_COUNT[bet.type]) {
      return `${bet.type} bet requires exactly ${EXPECTED_COUNT[bet.type]} unique numbers`;
    }
    for (const n of bet.numbers) {
      if (!Number.isInteger(n) || n < 0 || n > 36) return "numbers must be between 0 and 36";
    }
  }
  return null;
}

/** Whether `landed` satisfies a given (already-validated) bet — drives both settlement and payout. */
export function betWins(bet: RouletteBet, landed: number): boolean {
  switch (bet.type) {
    case "straight":
    case "split":
    case "street":
    case "corner":
    case "line":
      return bet.numbers.includes(landed);
    case "dozen":
    case "column":
      return bet.numbers.includes(landed);
    case "red":
      return colorOf(landed) === "red";
    case "black":
      return colorOf(landed) === "black";
    case "even":
      return landed !== 0 && landed % 2 === 0;
    case "odd":
      return landed !== 0 && landed % 2 === 1;
    case "low":
      return landed >= 1 && landed <= 18;
    case "high":
      return landed >= 19 && landed <= 36;
  }
}

export function payoutMultiplier(betType: RouletteBetType): number {
  return PAYOUTS[betType] + 1; // +1 returns the original stake alongside the win
}

/** Spin the wheel: a uniform float maps directly onto one of the 37 pockets (0-36). */
export function spinWheel(serverSeed: string, clientSeed: string, nonce: number): number {
  const float = floatFromSeed(serverSeed, clientSeed, nonce);
  return Math.floor(float * 37);
}

/** Helper for clients building dozen/column bets — expands a logical group into its pocket numbers. */
export function expandGroup(type: "dozen" | "column", group: 1 | 2 | 3): number[] {
  if (type === "dozen") {
    const start = (group - 1) * 12 + 1;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }
  // columns run vertically on the standard layout: column 1 = 1,4,7..34 ; 2 = 2,5,8..35 ; 3 = 3,6,9..36
  return Array.from({ length: 12 }, (_, i) => group + i * 3);
}
