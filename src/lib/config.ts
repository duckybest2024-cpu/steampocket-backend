import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "casino-aurelius-dev-secret-change-me",
  jwtExpiresIn: "7d" as const,
  startingBalance: 100_000, // cents -> $1,000.00 welcome bonus
  houseEdge: 0.01, // 1% — applied uniformly across every game's RTP target (99%)
};
