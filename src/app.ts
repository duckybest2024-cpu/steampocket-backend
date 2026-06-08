import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { fairnessRouter } from "./routes/fairness";
import { walletRouter } from "./routes/wallet";
import { betsRouter } from "./routes/bets";
import { instantGamesRouter } from "./routes/games/instantGames";
import { minesRouter } from "./routes/games/mines";
import { blackjackRouter } from "./routes/games/blackjack";
import { rouletteRouter } from "./routes/games/roulette";
import { slotsRouter } from "./routes/games/slots";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, name: "steampocket-casino", time: new Date().toISOString() }));

  app.use("/auth", authRouter);
  app.use("/fairness", fairnessRouter);
  app.use("/wallet", walletRouter);
  app.use("/bets", betsRouter);

  app.use("/games", instantGamesRouter); // /games/dice, /games/limbo, /games/plinko
  app.use("/games/mines", minesRouter);
  app.use("/games/blackjack", blackjackRouter);
  app.use("/games/roulette", rouletteRouter);
  app.use("/games/slots", slotsRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
