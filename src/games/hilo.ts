import { shuffledDeck } from "../lib/provablyFair";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

// Rank order for comparison: 2 is lowest, A is highest
const RANK_ORDER: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function buildStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function dealHiloDeck(serverSeed: string, clientSeed: string, nonce: number): Card[] {
  const deck = buildStandardDeck();
  return shuffledDeck(deck, serverSeed, clientSeed, nonce) as Card[];
}

export function rankOrder(rank: Rank): number {
  return RANK_ORDER[rank];
}

/**
 * Calculate the multiplier gain for a correct hi-lo guess.
 * probability = number of winning cards among remaining cards
 * multiplier factor = (1 / probability) * 0.99 (house edge)
 */
export function hiloMultiplierFactor(
  currentCard: Card,
  action: "higher" | "lower",
  remainingCards: Card[]
): number {
  const currentOrder = rankOrder(currentCard.rank);

  let winCount = 0;
  for (const card of remainingCards) {
    const order = rankOrder(card.rank);
    if (action === "higher" && order > currentOrder) winCount++;
    if (action === "lower" && order < currentOrder) winCount++;
  }

  if (winCount === 0) return 0; // impossible move
  const probability = winCount / remainingCards.length;
  return (1 / probability) * 0.99;
}

/**
 * Determine the outcome of a hi-lo guess.
 * Returns "correct" | "wrong" | "push" (equal rank)
 */
export function hiloOutcome(
  currentCard: Card,
  nextCard: Card,
  action: "higher" | "lower"
): "correct" | "wrong" | "push" {
  const current = rankOrder(currentCard.rank);
  const next = rankOrder(nextCard.rank);

  if (current === next) return "push";
  if (action === "higher" && next > current) return "correct";
  if (action === "lower" && next < current) return "correct";
  return "wrong";
}

/** Cards that are higher in rank order than the given card */
export function countHigher(card: Card, remaining: Card[]): number {
  const order = rankOrder(card.rank);
  return remaining.filter((c) => rankOrder(c.rank) > order).length;
}

/** Cards that are lower in rank order than the given card */
export function countLower(card: Card, remaining: Card[]): number {
  const order = rankOrder(card.rank);
  return remaining.filter((c) => rankOrder(c.rank) < order).length;
}
