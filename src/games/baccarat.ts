import { shuffledDeck } from "../lib/provablyFair";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type BaccaratBet = "player" | "banker" | "tie";
export type BaccaratWinner = "player" | "banker" | "tie";

export interface BaccaratResult {
  bet: BaccaratBet;
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: BaccaratWinner;
  multiplier: number;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function cardValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K" || rank === "10") return 0;
  return Number(rank);
}

function handTotal(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + cardValue(c.rank), 0) % 10;
}

export function playBaccarat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  bet: BaccaratBet
): BaccaratResult {
  const deck = buildDeck();
  const shuffled = shuffledDeck(deck, serverSeed, clientSeed, nonce) as Card[];

  // Deal: Player gets indices 0,2; Banker gets indices 1,3
  const playerCards: Card[] = [shuffled[0], shuffled[2]];
  const bankerCards: Card[] = [shuffled[1], shuffled[3]];
  let deckCursor = 4;

  const playerNatural = handTotal(playerCards) >= 8;
  const bankerNatural = handTotal(bankerCards) >= 8;

  if (!playerNatural && !bankerNatural) {
    const playerTot = handTotal(playerCards);

    // Player draws if total <= 5
    let playerThirdRank: number | null = null;
    if (playerTot <= 5) {
      playerCards.push(shuffled[deckCursor++]);
      playerThirdRank = cardValue(playerCards[2].rank);
    }

    // Banker drawing rules
    const bankerTot = handTotal(bankerCards);

    if (playerThirdRank === null) {
      // Player stood — banker draws on <= 5
      if (bankerTot <= 5) {
        bankerCards.push(shuffled[deckCursor++]);
      }
    } else {
      // Player drew — banker draw rules based on player's third card value
      const v = playerThirdRank;
      let bankerDraws = false;

      if (bankerTot <= 2) {
        bankerDraws = true;
      } else if (bankerTot === 3) {
        bankerDraws = v !== 8;
      } else if (bankerTot === 4) {
        bankerDraws = v >= 2 && v <= 7;
      } else if (bankerTot === 5) {
        bankerDraws = v >= 4 && v <= 7;
      } else if (bankerTot === 6) {
        bankerDraws = v === 6 || v === 7;
      }
      // bankerTot === 7: stand

      if (bankerDraws) {
        bankerCards.push(shuffled[deckCursor++]);
      }
    }
  }

  const playerTotal = handTotal(playerCards);
  const bankerTotal = handTotal(bankerCards);

  let winner: BaccaratWinner;
  if (playerTotal > bankerTotal) {
    winner = "player";
  } else if (bankerTotal > playerTotal) {
    winner = "banker";
  } else {
    winner = "tie";
  }

  // Determine multiplier based on bet vs winner
  let multiplier = 0;
  if (bet === "tie" && winner === "tie") {
    multiplier = 9;
  } else if (bet === "player" && winner === "player") {
    multiplier = 2;
  } else if (bet === "banker" && winner === "banker") {
    multiplier = 1.95; // 5% commission
  }

  return {
    bet,
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    winner,
    multiplier,
  };
}

export function validateBaccarat(bet: string): string | null {
  if (!["player", "banker", "tie"].includes(bet)) {
    return 'bet must be "player", "banker", or "tie"';
  }
  return null;
}
