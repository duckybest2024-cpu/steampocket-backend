import { describe, it, expect } from "vitest";
import {
  generateServerSeed,
  hashServerSeed,
  floatFromSeed,
  floatsFromSeed,
  shuffledDeck,
  verifyHash,
} from "../lib/provablyFair";

describe("provably fair engine", () => {
  it("hashes deterministically and verifies round-trip", () => {
    const seed = generateServerSeed();
    const hash = hashServerSeed(seed);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyHash(seed, hash)).toBe(true);
    expect(verifyHash("tampered-seed", hash)).toBe(false);
  });

  it("derives identical floats for identical (seed, clientSeed, nonce) — the core replayability guarantee", () => {
    const seed = "fixed-server-seed";
    const a = floatFromSeed(seed, "client", 5);
    const b = floatFromSeed(seed, "client", 5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it("produces different streams for different nonces", () => {
    const seed = "fixed-server-seed";
    const a = floatFromSeed(seed, "client", 1);
    const b = floatFromSeed(seed, "client", 2);
    expect(a).not.toBe(b);
  });

  it("walks multiple independent floats from one seed triple via the cursor", () => {
    const floats = floatsFromSeed("seed", "client", 0, 20);
    expect(floats).toHaveLength(20);
    for (const f of floats) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    // No collisions across a reasonably sized sample — sanity check on distribution.
    expect(new Set(floats).size).toBe(20);
  });

  it("shuffles deterministically and produces a permutation (no duplicates/drops)", () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = shuffledDeck(items, "seed", "client", 0);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled).size).toBe(52);
    expect(shuffledDeck(items, "seed", "client", 0)).toEqual(shuffled);
    expect(shuffledDeck(items, "seed", "client", 1)).not.toEqual(shuffled);
  });
});
