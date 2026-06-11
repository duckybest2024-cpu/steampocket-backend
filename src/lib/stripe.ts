export const CHIP_PACKAGES = [
  { id: "micro",      chips: 50,    priceCents: 50,    priceUAH: 2000,    name: "Micro Pack",      emoji: "🔵", badge: "Try it out",  saving: null },
  { id: "starter",    chips: 100,   priceCents: 100,   priceUAH: 4100,    name: "Starter Pack",    emoji: "🟡", badge: "Best intro",  saving: null },
  { id: "regular",    chips: 500,   priceCents: 400,   priceUAH: 16400,   name: "Regular Pack",    emoji: "🔴", badge: "20% off",     saving: "save $0.60" },
  { id: "pro",        chips: 1000,  priceCents: 700,   priceUAH: 28700,   name: "Pro Pack",        emoji: "💜", badge: "30% off",     saving: "save $3" },
  { id: "vip",        chips: 2500,  priceCents: 1500,  priceUAH: 61500,   name: "VIP Pack",        emoji: "🟣", badge: "40% off",     saving: "save $10" },
  { id: "highroller", chips: 5000,  priceCents: 2500,  priceUAH: 102500,  name: "High Roller",     emoji: "⚫", badge: "Best value",  saving: "save $25" },
  { id: "whale",      chips: 15000, priceCents: 6000,  priceUAH: 246000,  name: "Whale Pack",      emoji: "🔷", badge: "50% off",     saving: "save $90" },
  { id: "diamond",    chips: 50000, priceCents: 15000, priceUAH: 615000,  name: "Diamond Pack",    emoji: "💎", badge: "Max value",   saving: "save $350" },
] as const;

export type PackageId = (typeof CHIP_PACKAGES)[number]["id"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStripe(): any | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    return new Stripe(key);
  } catch (err) {
    console.error("Failed to initialise Stripe SDK:", err);
    return null;
  }
}
