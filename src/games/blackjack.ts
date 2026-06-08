import { shuffledDeck } from "../lib/provablyFair";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface Card {
  suit: Suit;
  rank: Rank;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** Six-deck shoe — standard for online blackjack, keeps card-counting impractical and variance smooth. */
const SHOE_DECKS = 6;

export function freshShoe(serverSeed: string, clientSeed: string, nonce: number): Card[] {
  const singleDeck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) singleDeck.push({ suit, rank });
  const shoe = Array.from({ length: SHOE_DECKS }, () => singleDeck).flat();
  return shuffledDeck(shoe, serverSeed, clientSeed, nonce);
}

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K" || rank === "10") return 10;
  return Number(rank);
}

/** Best total <= 21 if possible; soft hands (containing an Ace counted as 11) are flagged. */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((sum, c) => sum + cardValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === "A").length;
  let soft = aces > 0;

  while (total > 21 && aces > 0) {
    total -= 10; // demote an Ace from 11 -> 1
    aces -= 1;
  }
  soft = aces > 0 && total <= 21;

  return { total, soft };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

export interface BlackjackHand {
  cards: Card[];
  bet: number;
  status: "playing" | "stood" | "bust" | "blackjack" | "surrendered";
  doubled: boolean;
}

export interface BlackjackState {
  shoe: Card[]; // remaining cards, drawn from the front
  cursor: number; // index of next card to deal
  dealer: Card[];
  hands: BlackjackHand[];
  activeHand: number;
  baseBet: number;
  status: "player_turn" | "dealer_turn" | "settled";
  insuranceOffered: boolean;
  insuranceTaken: boolean;
}

export function dealCard(state: BlackjackState): Card {
  const card = state.shoe[state.cursor];
  state.cursor += 1;
  return card;
}

/** Deal the opening hand: player gets two cards, dealer gets one up + one hole card. */
export function startRound(shoe: Card[], baseBet: number): BlackjackState {
  const state: BlackjackState = {
    shoe,
    cursor: 0,
    dealer: [],
    hands: [{ cards: [], bet: baseBet, status: "playing", doubled: false }],
    activeHand: 0,
    baseBet,
    status: "player_turn",
    insuranceOffered: false,
    insuranceTaken: false,
  };

  state.hands[0].cards.push(dealCard(state));
  state.dealer.push(dealCard(state));
  state.hands[0].cards.push(dealCard(state));
  state.dealer.push(dealCard(state)); // hole card — index 1, hidden until dealer's turn

  if (state.dealer[0].rank === "A") state.insuranceOffered = true;

  if (isBlackjack(state.hands[0].cards)) {
    state.hands[0].status = "blackjack";
    state.status = isBlackjack(state.dealer) ? "settled" : "dealer_turn";
  }

  return state;
}

export function canSplit(hand: BlackjackHand): boolean {
  return (
    hand.cards.length === 2 &&
    hand.status === "playing" &&
    cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank)
  );
}

export function canDouble(hand: BlackjackHand): boolean {
  return hand.cards.length === 2 && hand.status === "playing";
}

/** Run out the dealer's hand once every player hand has finished — stands on all 17s. */
export function playDealerHand(state: BlackjackState): void {
  state.status = "dealer_turn";
  const anyAlive = state.hands.some((h) => h.status === "stood" || h.status === "blackjack");
  if (anyAlive) {
    while (handValue(state.dealer).total < 17) {
      state.dealer.push(dealCard(state));
    }
  }
  state.status = "settled";
}

export interface HandSettlement {
  handIndex: number;
  outcome: "win" | "push" | "loss" | "blackjack";
  payout: number; // total returned (stake + profit), 0 on loss
}

/** Compare every player hand against the final dealer hand and compute payouts (1:1, 3:2 for naturals). */
export function settleHands(state: BlackjackState): HandSettlement[] {
  const dealerTotal = handValue(state.dealer).total;
  const dealerBlackjack = isBlackjack(state.dealer);
  const dealerBust = dealerTotal > 21;

  return state.hands.map((hand, handIndex) => {
    const playerTotal = handValue(hand.cards).total;

    if (hand.status === "surrendered") {
      return { handIndex, outcome: "loss", payout: Math.floor(hand.bet / 2) };
    }
    if (hand.status === "bust") {
      return { handIndex, outcome: "loss", payout: 0 };
    }
    if (hand.status === "blackjack") {
      if (dealerBlackjack) return { handIndex, outcome: "push", payout: hand.bet };
      return { handIndex, outcome: "blackjack", payout: Math.floor(hand.bet * 2.5) }; // 3:2 payout
    }
    if (dealerBlackjack) return { handIndex, outcome: "loss", payout: 0 };
    if (dealerBust) return { handIndex, outcome: "win", payout: hand.bet * 2 };
    if (playerTotal > dealerTotal) return { handIndex, outcome: "win", payout: hand.bet * 2 };
    if (playerTotal < dealerTotal) return { handIndex, outcome: "loss", payout: 0 };
    return { handIndex, outcome: "push", payout: hand.bet };
  });
}
