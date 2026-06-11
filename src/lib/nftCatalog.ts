// This file will be replaced with the full 400-entry catalog.
// Stub keeps the build green in the meantime.

export interface NftPower {
  type: "chips_bonus" | "xp_bonus" | "jackpot_entry" | "free_spin" | "multiplier_boost";
  label: string;
  value: number;
  description: string;
}

export interface NftTemplate {
  id: string;
  name: string;
  collection: string;
  collectionId: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "unique";
  emoji: string;
  description: string;
  priceChips: number;
  supply: number;
  power: NftPower | null;
  tags: string[];
}

export const NFT_CATALOG: NftTemplate[] = [];
