import express from "express";
import cors from "cors";
import path from "path";
import { authRouter } from "./routes/auth";
import { fairnessRouter } from "./routes/fairness";
import { walletRouter } from "./routes/wallet";
import { betsRouter } from "./routes/bets";
import { instantGamesRouter } from "./routes/games/instantGames";
import { minesRouter } from "./routes/games/mines";
import { blackjackRouter } from "./routes/games/blackjack";
import { rouletteRouter } from "./routes/games/roulette";
import { slotsRouter } from "./routes/games/slots";
import { hiloRouter } from "./routes/games/hilo";
import { videoPokerRouter } from "./routes/games/videopoker";
import { stripeWebhookHandler } from "./routes/stripeWebhook";

export function createApp() {
  const app = express();

  app.use(cors());

  // Stripe webhook must receive the raw body — register before express.json()
  app.post("/wallet/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, name: "casino-aurelius", time: new Date().toISOString() }));

  // The playable web UI — a static single-page app that talks to the API below.
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use("/auth", authRouter);
  app.use("/fairness", fairnessRouter);
  app.use("/wallet", walletRouter);
  app.use("/bets", betsRouter);

  app.use("/games", instantGamesRouter); // /games/dice, /games/limbo, /games/plinko
  app.use("/games/mines", minesRouter);
  app.use("/games/blackjack", blackjackRouter);
  app.use("/games/roulette", rouletteRouter);
  app.use("/games/slots", slotsRouter);
  app.use("/games/hilo", hiloRouter);
  app.use("/games/videopoker", videoPokerRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
