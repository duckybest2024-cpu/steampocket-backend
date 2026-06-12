export const CHIP_PACKAGES = [
  { id: "micro",      chips: 10,    priceCents: 100,   priceUAH: 4100,    name: "Micro Pack",   emoji: "🔵", badge: "Try it out",  saving: null },
  { id: "starter",    chips: 50,    priceCents: 500,   priceUAH: 20500,   name: "Starter Pack", emoji: "🟡", badge: "Best intro",  saving: null },
  { id: "regular",    chips: 100,   priceCents: 900,   priceUAH: 36900,   name: "Regular Pack", emoji: "🔴", badge: "10% off",     saving: "save $0.10" },
  { id: "pro",        chips: 250,   priceCents: 2000,  priceUAH: 82000,   name: "Pro Pack",     emoji: "💜", badge: "20% off",     saving: "save $0.50" },
  { id: "vip",        chips: 500,   priceCents: 3500,  priceUAH: 143500,  name: "VIP Pack",     emoji: "🟣", badge: "30% off",     saving: "save $1.50" },
  { id: "highroller", chips: 1000,  priceCents: 6000,  priceUAH: 246000,  name: "High Roller",  emoji: "⚫", badge: "40% off",     saving: "save $4" },
  { id: "whale",      chips: 2500,  priceCents: 12000, priceUAH: 492000,  name: "Whale Pack",   emoji: "🔷", badge: "52% off",     saving: "save $13" },
  { id: "diamond",    chips: 10000, priceCents: 35000, priceUAH: 1435000, name: "Diamond Pack", emoji: "💎", badge: "65% off",     saving: "save $65" },
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
