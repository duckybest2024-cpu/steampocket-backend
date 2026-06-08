import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken, requireAuth, AuthedRequest } from "../middleware/auth";
import { createSeedPair } from "../lib/provablyFair";
import { config } from "../lib/config";

export const authRouter = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

authRouter.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { username, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) return res.status(409).json({ error: "Username or email already taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const seedPair = createSeedPair();

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      balance: config.startingBalance,
      serverSeed: seedPair.serverSeed,
      serverSeedHash: seedPair.serverSeedHash,
      clientSeed: seedPair.clientSeed,
    },
  });

  await prisma.transaction.create({
    data: { userId: user.id, type: "bonus", amount: config.startingBalance, balance: config.startingBalance, reference: "welcome_bonus" },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

const loginSchema = z.object({
  identifier: z.string().min(1), // username or email
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Username/email and password are required" });

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

export function publicUser(user: {
  id: string;
  username: string;
  email: string;
  balance: number;
  level: number;
  xp: number;
  createdAt: Date;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    level: user.level,
    xp: user.xp,
    createdAt: user.createdAt,
    fairness: {
      activeServerSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
    },
  };
}
