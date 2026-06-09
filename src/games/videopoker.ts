import { shuffledDeck } from "../lib/provablyFair";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandRank =
  | "royal_flush"
  | "straight_flush"
  | "four_of_a_kind"
  | "full_house"
  | "flush"
  | "straight"
  | "three_of_a_kind"
  | "two_pair"
  | "jacks_or_better"
  | "high_card";

/** Jacks or Better pay table (multiplier of bet) */
export const PAY_TABLE: Record<HandRank, number> = {
  royal_flush:     800,
  straight_flush:   50,
  four_of_a_kind:   25,
  full_house:        9,
  flush:             6,
  straight:          4,
  three_of_a_kind:   3,
  two_pair:          2,
  jacks_or_better:   1,
  high_card:         0,
};

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** Numeric value for rank-based sorting. Ace can be high or low for straights. */
const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function dealVideoPokerDeck(serverSeed: string, clientSeed: string, nonce: number): Card[] {
  const deck = buildDeck();
  return shuffledDeck(deck, serverSeed, clientSeed, nonce) as Card[];
}

/** Evaluate a 5-card poker hand per Jacks or Better rules. */
export function evaluateHand(hand: Card[]): HandRank {
  const values = hand.map((c) => RANK_VALUE[c.rank]).sort((a, b) => a - b);
  const suits = hand.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight (including A-2-3-4-5 wheel)
  const isStraight = checkStraight(values);

  if (isFlush && isStraight) {
    // Royal flush: 10-J-Q-K-A all same suit
    if (values[0] === 10 && values[4] === 14) return "royal_flush";
    return "straight_flush";
  }

  // Count occurrences of each rank value
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const freq = Array.from(counts.values()).sort((a, b) => b - a);

  if (freq[0] === 4) return "four_of_a_kind";
  if (freq[0] === 3 && freq[1] === 2) return "full_house";
  if (isFlush) return "flush";
  if (isStraight) return "straight";
  if (freq[0] === 3) return "three_of_a_kind";
  if (freq[0] === 2 && freq[1] === 2) return "two_pair";

  if (freq[0] === 2) {
    // Jacks or better: the pair must be J, Q, K, or A (value >= 11)
    for (const [value, count] of counts.entries()) {
      if (count === 2 && value >= 11) return "jacks_or_better";
    }
    return "high_card";
  }

  return "high_card";
}

function checkStraight(sortedValues: number[]): boolean {
  // Normal straight
  if (sortedValues[4] - sortedValues[0] === 4 && new Set(sortedValues).size === 5) {
    return true;
  }
  // Wheel straight: A-2-3-4-5 (values: 2,3,4,5,14)
  if (
    sortedValues[0] === 2 &&
    sortedValues[1] === 3 &&
    sortedValues[2] === 4 &&
    sortedValues[3] === 5 &&
    sortedValues[4] === 14
  ) {
    return true;
  }
  return false;
}
