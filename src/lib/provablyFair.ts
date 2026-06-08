import crypto from "crypto";

/**
 * Provably-fair engine shared by every game.
 *
 * Standard "Stake-style" scheme:
 *   - Server generates a `serverSeed` and shows the player only sha256(serverSeed) up front.
 *   - Player supplies (or is assigned) a `clientSeed`.
 *   - Each bet increments a per-seed-pair `nonce`.
 *   - Result floats are derived from HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
 *     by walking the digest in 4-byte chunks and normalising to [0, 1).
 *   - After rotating to a new server seed, the old one is revealed so anyone can replay
 *     every bet made under it and verify the outcome byte-for-byte.
 */

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Derive an arbitrary number of independent floats in [0, 1) from a single
 * (serverSeed, clientSeed, nonce) triple. `cursor` re-seeds the HMAC message so
 * games that need several random values per round (e.g. dealing N cards, dropping
 * a plinko ball through M rows) get independent, replayable streams.
 */
export function floatsFromSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
  cursor = 0
): number[] {
  const floats: number[] = [];
  let currentCursor = cursor;

  while (floats.length < count) {
    const hmac = crypto
      .createHmac("sha256", serverSeed)
      .update(`${clientSeed}:${nonce}:${currentCursor}`)
      .digest();

    // Walk the 32-byte digest in 4-byte windows -> 8 floats per HMAC call.
    for (let offset = 0; offset + 4 <= hmac.length && floats.length < count; offset += 4) {
      const int = hmac.readUInt32BE(offset);
      floats.push(int / 0x100000000); // normalise to [0, 1)
    }
    currentCursor += 1;
  }

  return floats;
}

export function floatFromSeed(serverSeed: string, clientSeed: string, nonce: number, cursor = 0): number {
  return floatsFromSeed(serverSeed, clientSeed, nonce, 1, cursor)[0];
}

/** Fisher-Yates shuffle driven entirely by the seed stream — used for cards, plinko, etc. */
export function shuffledDeck<T>(items: T[], serverSeed: string, clientSeed: string, nonce: number, cursor = 0): T[] {
  const deck = [...items];
  const floats = floatsFromSeed(serverSeed, clientSeed, nonce, deck.length, cursor);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(floats[deck.length - 1 - i] * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface SeedPair {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export function createSeedPair(clientSeed = "default-client-seed"): SeedPair {
  const serverSeed = generateServerSeed();
  return {
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed,
    nonce: 0,
  };
}

/** Re-derive a result and confirm it matches what was paid out — used by the /verify endpoint. */
export function verifyHash(serverSeed: string, expectedHash: string): boolean {
  return hashServerSeed(serverSeed) === expectedHash;
}
