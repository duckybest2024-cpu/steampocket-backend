import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(header.slice("Bearer ".length), config.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireApproved(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isApproved: true, approvedUntil: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    const expired = user.approvedUntil && user.approvedUntil < new Date();
    if (!user.isApproved || expired) {
      return res.status(403).json({ error: "Active subscription required to play. Visit patreon.com/GrilledCoin." });
    }
    next();
  } catch {
    res.status(500).json({ error: "Auth check failed" });
  }
}
