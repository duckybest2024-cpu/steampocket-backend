import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";

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
