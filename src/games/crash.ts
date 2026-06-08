import { generateServerSeed, hashServerSeed, floatFromSeed } from "../lib/provablyFair";
import { multiplierFromFloat } from "./limbo";
import { config } from "../lib/config";

/**
 * The crash curve climbs exponentially so early cashouts feel inevitable and late
 * ones feel like a dare — `multiplier = e^(GROWTH * elapsedSeconds)`.
 * GROWTH is tuned so the average round lasts a few seconds before reaching 2x.
 */
const GROWTH_RATE = 0.06;

export function multiplierAtElapsed(elapsedMs: number): number {
  const seconds = elapsedMs / 1000;
  return Number(Math.exp(GROWTH_RATE * seconds).toFixed(2));
}

export function elapsedForMultiplier(multiplier: number): number {
  return (Math.log(multiplier) / GROWTH_RATE) * 1000;
}

export interface CrashRoundSeed {
  serverSeed: string;
  serverSeedHash: string;
  crashPoint: number;
}

/** Generate a brand-new round: fresh server seed, public hash, and the (secret-until-reveal) crash point. */
export function generateCrashRound(clientSeed = "crash-public-seed", nonce = 0): CrashRoundSeed {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const float = floatFromSeed(serverSeed, clientSeed, nonce);
  const crashPoint = multiplierFromFloat(float, config.houseEdge);
  return { serverSeed, serverSeedHash, crashPoint };
}
