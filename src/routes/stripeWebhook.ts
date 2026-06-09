import { Request, Response } from "express";
import { getStripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { applyLedgerEntry } from "../lib/wallet";

export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET not configured" });
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const chipsStr = session.metadata?.chips;

    if (!userId || !chipsStr) {
      console.error("Missing metadata on checkout session", session.id);
      return res.json({ received: true });
    }

    const chips = parseInt(chipsStr, 10);
    const cents = chips * 100; // 1 chip = $1 = 100 cents

    try {
      await applyLedgerEntry(prisma, userId, "deposit", cents, `stripe_${session.id}`);
      console.log(`Credited ${chips} chips to user ${userId} via Stripe session ${session.id}`);
    } catch (err) {
      console.error("Failed to credit chips:", err);
      return res.status(500).json({ error: "Failed to credit chips" });
    }
  }

  res.json({ received: true });
}
