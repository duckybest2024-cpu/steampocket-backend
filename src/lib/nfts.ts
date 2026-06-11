import { prisma } from "./prisma";

interface NftTemplate {
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: string;
  emoji: string;
}

const WIN_NFTS: NftTemplate[] = [
  { name: "Lucky Clover", description: "Awarded for your first win", rarity: "common", category: "first", emoji: "🍀" },
  { name: "Silver Coin", description: "10x multiplier achieved", rarity: "uncommon", category: "win", emoji: "🪙" },
  { name: "Golden Crown", description: "50x multiplier achieved", rarity: "rare", category: "win", emoji: "👑" },
  { name: "Diamond Chip", description: "100x multiplier achieved", rarity: "epic", category: "win", emoji: "💎" },
  { name: "Dragon's Hoard", description: "500x multiplier achieved", rarity: "legendary", category: "win", emoji: "🐉" },
  { name: "Jackpot Trophy", description: "Won a jackpot round", rarity: "rare", category: "win", emoji: "🏆" },
  { name: "High Roller", description: "Single bet over 10,000 chips", rarity: "uncommon", category: "win", emoji: "🎰" },
];

const LEVEL_NFTS: NftTemplate[] = [
  { name: "Bronze Star", description: "Reached level 5", rarity: "common", category: "level", emoji: "⭐" },
  { name: "Silver Star", description: "Reached level 10", rarity: "uncommon", category: "level", emoji: "🌟" },
  { name: "Gold Star", description: "Reached level 25", rarity: "rare", category: "level", emoji: "✨" },
  { name: "Platinum Star", description: "Reached level 50", rarity: "epic", category: "level", emoji: "💫" },
  { name: "Legend Badge", description: "Reached level 100", rarity: "legendary", category: "level", emoji: "🌠" },
];

const STREAK_NFTS: NftTemplate[] = [
  { name: "Hot Streak", description: "3 wins in a row", rarity: "common", category: "streak", emoji: "🔥" },
  { name: "Blazing Run", description: "5 wins in a row", rarity: "uncommon", category: "streak", emoji: "⚡" },
  { name: "Unstoppable", description: "10 wins in a row", rarity: "rare", category: "streak", emoji: "🚀" },
];

export async function checkAndMintNfts(userId: string, context: {
  multiplier?: number;
  level?: number;
  winStreak?: number;
  isJackpotWin?: boolean;
  betAmount?: number;
}): Promise<void> {
  const toMint: NftTemplate[] = [];

  if (context.multiplier !== undefined) {
    if (context.multiplier >= 500) toMint.push(WIN_NFTS[4]);
    else if (context.multiplier >= 100) toMint.push(WIN_NFTS[3]);
    else if (context.multiplier >= 50) toMint.push(WIN_NFTS[2]);
    else if (context.multiplier >= 10) toMint.push(WIN_NFTS[1]);
  }

  if (context.isJackpotWin) toMint.push(WIN_NFTS[5]);

  if (context.betAmount && context.betAmount >= 1_000_000) toMint.push(WIN_NFTS[6]);

  if (context.level !== undefined) {
    if (context.level >= 100) toMint.push(LEVEL_NFTS[4]);
    else if (context.level >= 50) toMint.push(LEVEL_NFTS[3]);
    else if (context.level >= 25) toMint.push(LEVEL_NFTS[2]);
    else if (context.level >= 10) toMint.push(LEVEL_NFTS[1]);
    else if (context.level >= 5) toMint.push(LEVEL_NFTS[0]);
  }

  if (context.winStreak !== undefined) {
    if (context.winStreak >= 10) toMint.push(STREAK_NFTS[2]);
    else if (context.winStreak >= 5) toMint.push(STREAK_NFTS[1]);
    else if (context.winStreak >= 3) toMint.push(STREAK_NFTS[0]);
  }

  for (const tmpl of toMint) {
    const existing = await prisma.nft.findFirst({ where: { ownerId: userId, name: tmpl.name } });
    if (!existing) {
      await prisma.nft.create({
        data: { ownerId: userId, ...tmpl },
      }).catch(() => {}); // ignore duplicates from race conditions
    }
  }
}
