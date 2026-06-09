// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require("stripe");

export const CHIP_PACKAGES = [
  { id: "starter",    chips: 100,   priceCents: 100,  name: "Starter Pack",  emoji: "🟡", badge: "Best intro" },
  { id: "regular",    chips: 500,   priceCents: 400,  name: "Regular Pack",  emoji: "🔴", badge: "20% off" },
  { id: "pro",        chips: 1000,  priceCents: 700,  name: "Pro Pack",      emoji: "💜", badge: "30% off" },
  { id: "highroller", chips: 5000,  priceCents: 3000, name: "High Roller",   emoji: "⚫", badge: "Best value" },
] as const;

export type PackageId = (typeof CHIP_PACKAGES)[number]["id"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStripe(): any | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
