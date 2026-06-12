import crypto from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken, requireAuth, AuthedRequest } from "../middleware/auth";
import { createSeedPair } from "../lib/provablyFair";
import { config } from "../lib/config";
import { sendVerificationEmail } from "../lib/mailer";

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

  try {
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) return res.status(409).json({ error: "Username or email already taken" });

    const passwordHash = await bcrypt.hash(password, 10);
    const seedPair = createSeedPair();

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        balance: 0,
        serverSeed: seedPair.serverSeed,
        serverSeedHash: seedPair.serverSeedHash,
        clientSeed: seedPair.clientSeed,
        emailVerified: true,
      },
    });

    res.status(201).json({
      token: signToken(user.id),
      user: publicUser({ ...user, emailVerified: true }),
      message: "Account created! Purchase chips to start playing.",
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.includes("email") ? "email" : "username";
      return res.status(409).json({ error: `That ${field} is already taken` });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed — please try again" });
  }
});

// ---------------------------------------------------------------------------
// Verify email via token link — opens in browser from email
// ---------------------------------------------------------------------------
authRouter.get("/verify-email", async (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.redirect("/?emailVerified=error");

  try {
    const user = await prisma.user.findFirst({
      where: { emailToken: token, emailTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      // Token not found or expired — redirect to login with error flag
      return res.redirect("/?emailVerified=expired");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailToken: null, emailTokenExpiry: null },
    });

    // Redirect to the app; the SPA will detect the query param and show a success message
    res.redirect("/?emailVerified=ok");
  } catch (err) {
    console.error("Email verification error:", err);
    res.redirect("/?emailVerified=error");
  }
});

// ---------------------------------------------------------------------------
// Resend verification email
// ---------------------------------------------------------------------------
authRouter.post("/resend-verification", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking whether an email exists
    if (!user || user.emailVerified) {
      return res.json({ message: "If that email is registered and unverified, a new link has been sent." });
    }

    const emailToken = crypto.randomBytes(32).toString("hex");
    const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { emailToken, emailTokenExpiry } });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${emailToken}`;
    await sendVerificationEmail(email, user.username, verificationUrl).catch(console.error);

    res.json({ message: "Verification link generated!", verificationLink: verificationUrl });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ error: "Failed to resend — please try again" });
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Username/email and password are required" });

  const { identifier, password } = parsed.data;
  try {
    const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed — please try again" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to load account" });
  }
});

export function publicUser(user: {
  id: string;
  username: string;
  nickname: string | null;
  rank: string;
  email: string;
  balance: number;
  bank: number;
  level: number;
  xp: number;
  createdAt: Date;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  emailVerified: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    rank: user.rank,
    email: user.email,
    balance: user.balance,
    bank: user.bank,
    level: user.level,
    xp: user.xp,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    fairness: {
      activeServerSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
    },
  };
}
