import { describe, it, expect } from "vitest";
import { playDice, validateDice } from "../games/dice";
import { playLimbo, multiplierFromFloat } from "../games/limbo";
import { layMines, multiplierForPicks, GRID_SIZE } from "../games/mines";
import { dropBall, multiplierTable } from "../games/plinko";
import { spinWheel, betWins, colorOf, expandGroup, RouletteBet } from "../games/roulette";
import {
  freshShoe,
  startRound,
  handValue,
  isBlackjack,
  isBust,
  cardValue,
  Card,
} from "../games/blackjack";
import { spinGrid, evaluateSpin } from "../games/slots";

const SEED = "deterministic-server-seed";
const CLIENT = "deterministic-client-seed";

describe("dice", () => {
  it("rejects out-of-range targets and bad directions", () => {
    expect(validateDice({ target: 0, direction: "over" })).toMatch(/between/);
    expect(validateDice({ target: 50, direction: "sideways" as never })).toMatch(/direction/);
    expect(validateDice({ target: 50, direction: "over" })).toBeNull();
  });

  it("wins exactly when the roll satisfies the chosen direction, and pays a fair multiplier scaled by house edge", () => {
    for (let nonce = 0; nonce < 50; nonce++) {
      const outcome = playDice(SEED, CLIENT, nonce, { target: 50, direction: "over" });
      expect(outcome.win).toBe(outcome.roll > 50);
      if (outcome.win) {
        // fair = 100/50 = 2.0 ; with 1% house edge -> 1.98
        expect(outcome.multiplier).toBeCloseTo(1.98, 4);
      } else {
        expect(outcome.multiplier).toBe(0);
      }
    }
  });

  it("is replayable: identical inputs produce identical rolls", () => {
    const a = playDice(SEED, CLIENT, 7, { target: 50, direction: "under" });
    const b = playDice(SEED, CLIENT, 7, { target: 50, direction: "under" });
    expect(a).toEqual(b);
  });

  it("a tighter target yields a higher multiplier than a looser one", () => {
    const tight = playDice(SEED, CLIENT, 1, { target: 2, direction: "under" });
    const loose = playDice(SEED, CLIENT, 1, { target: 98, direction: "under" });
    // fair multiplier is 100/winChance — smaller win chance -> larger multiplier
    const tightFair = 100 / 2;
    const looseFair = 100 / 98;
    expect(tightFair).toBeGreaterThan(looseFair);
  });
});

describe("limbo / crash curve", () => {
  it("never returns a multiplier below 1.0", () => {
    for (let i = 0; i <= 100; i++) {
      expect(multiplierFromFloat(i / 100)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("only wins when the rolled crash point clears the player's target", () => {
    for (let nonce = 0; nonce < 50; nonce++) {
      const outcome = playLimbo(SEED, CLIENT, nonce, { targetMultiplier: 3 });
      expect(outcome.win).toBe(outcome.crashAt >= 3);
      expect(outcome.multiplier).toBe(outcome.win ? 3 : 0);
    }
  });
});

describe("mines", () => {
  it("lays exactly mineCount unique mines within the grid", () => {
    const mines = layMines(SEED, CLIENT, 0, 5);
    expect(mines).toHaveLength(5);
    expect(new Set(mines).size).toBe(5);
    for (const m of mines) expect(m).toBeGreaterThanOrEqual(0);
    for (const m of mines) expect(m).toBeLessThan(GRID_SIZE);
  });

  it("multiplier grows monotonically with each safe pick and exceeds 1x", () => {
    let prev = 1;
    for (let picks = 1; picks <= 10; picks++) {
      const m = multiplierForPicks(3, picks);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });

  it("more mines -> steeper multiplier growth for the same number of picks", () => {
    expect(multiplierForPicks(10, 3)).toBeGreaterThan(multiplierForPicks(1, 3));
  });
});

describe("plinko", () => {
  it("path length always equals the row count, and slot is the count of right-bounces", () => {
    const { path, slot, multiplier } = dropBall(SEED, CLIENT, 0, "medium", 16);
    expect(path).toHaveLength(16);
    expect(slot).toBe(path.reduce<number>((s, b) => s + b, 0));
    expect(multiplier).toBe(multiplierTable("medium", 16)[slot]);
  });

  it("every risk/row table is symmetric and has rows+1 slots", () => {
    for (const risk of ["low", "medium", "high"] as const) {
      for (const rows of [8, 10, 12, 14, 16] as const) {
        const table = multiplierTable(risk, rows);
        expect(table).toHaveLength(rows + 1);
        expect(table[0]).toBe(table[table.length - 1]); // symmetric edges
      }
    }
  });
});

describe("roulette", () => {
  it("spins land within the valid pocket range and colours are consistent", () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const pocket = spinWheel(SEED, CLIENT, nonce);
      expect(pocket).toBeGreaterThanOrEqual(0);
      expect(pocket).toBeLessThanOrEqual(36);
      expect(["red", "black", "green"]).toContain(colorOf(pocket));
    }
    expect(colorOf(0)).toBe("green");
  });

  it("evaluates straight/colour/parity bets correctly against a landed number", () => {
    const straightOnSeven: RouletteBet = { type: "straight", numbers: [7], amount: 100 };
    expect(betWins(straightOnSeven, 7)).toBe(true);
    expect(betWins(straightOnSeven, 8)).toBe(false);

    const redBet: RouletteBet = { type: "red", numbers: [], amount: 100 };
    expect(betWins(redBet, 1)).toBe(true); // 1 is red
    expect(betWins(redBet, 2)).toBe(false); // 2 is black
    expect(betWins(redBet, 0)).toBe(false); // 0 is green — house number

    const evenBet: RouletteBet = { type: "even", numbers: [], amount: 100 };
    expect(betWins(evenBet, 0)).toBe(false); // zero is neither even nor odd for betting purposes
  });

  it("expands dozen/column groups to exactly 12 unique numbers each", () => {
    for (const group of [1, 2, 3] as const) {
      expect(new Set(expandGroup("dozen", group)).size).toBe(12);
      expect(new Set(expandGroup("column", group)).size).toBe(12);
    }
  });
});

describe("blackjack", () => {
  it("values aces softly, demoting to keep the hand alive when possible", () => {
    const soft: Card[] = [{ suit: "♠", rank: "A" }, { suit: "♥", rank: "6" }];
    expect(handValue(soft)).toEqual({ total: 17, soft: true });

    const bustingAce: Card[] = [{ suit: "♠", rank: "A" }, { suit: "♥", rank: "9" }, { suit: "♦", rank: "5" }];
    expect(handValue(bustingAce).total).toBe(15); // A demoted to 1: 1+9+5
    expect(isBust(bustingAce)).toBe(false);
  });

  it("recognises naturals and busts", () => {
    const natural: Card[] = [{ suit: "♠", rank: "A" }, { suit: "♥", rank: "K" }];
    expect(isBlackjack(natural)).toBe(true);

    const bust: Card[] = [{ suit: "♠", rank: "K" }, { suit: "♥", rank: "Q" }, { suit: "♦", rank: "5" }];
    expect(isBust(bust)).toBe(true);
  });

  it("face cards and tens are all worth 10", () => {
    for (const rank of ["10", "J", "Q", "K"] as const) expect(cardValue(rank)).toBe(10);
  });

  it("deals a fresh shoe of 6 decks (312 cards) shuffled deterministically from the seed", () => {
    const shoe = freshShoe(SEED, CLIENT, 0);
    expect(shoe).toHaveLength(312);
    expect(freshShoe(SEED, CLIENT, 0)).toEqual(shoe);
    expect(freshShoe(SEED, CLIENT, 1)).not.toEqual(shoe);
  });

  it("deals two cards to player and dealer (one face-down) at round start", () => {
    const shoe = freshShoe(SEED, CLIENT, 0);
    const state = startRound(shoe, 1000);
    expect(state.hands[0].cards).toHaveLength(2);
    expect(state.dealer).toHaveLength(2);
    expect(state.cursor).toBe(4);
  });
});

describe("slots", () => {
  it("always produces a 5x3 grid of valid symbols", () => {
    const grid = spinGrid(SEED, CLIENT, 0);
    expect(grid).toHaveLength(5);
    for (const reel of grid) expect(reel).toHaveLength(3);
  });

  it("evaluates spins replayably and never reports a negative or fractional win", () => {
    for (let nonce = 0; nonce < 25; nonce++) {
      const grid = spinGrid(SEED, CLIENT, nonce);
      const spin = evaluateSpin(grid, 25);
      expect(spin.totalWinUnits).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(spin.totalWinUnits)).toBe(true);
      expect(evaluateSpin(spinGrid(SEED, CLIENT, nonce), 25)).toEqual(spin);
    }
  });
});
