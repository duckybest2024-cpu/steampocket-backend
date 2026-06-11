-- Auto-verify all existing unverified accounts (email verification removed)
UPDATE "User" SET "emailVerified" = 1 WHERE "emailVerified" = 0;

-- NFT collectibles
CREATE TABLE IF NOT EXISTS "Nft" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "ownerId"     TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "rarity"      TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "emoji"       TEXT NOT NULL,
  "mintedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Nft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Nft_ownerId_idx" ON "Nft"("ownerId");

-- Trade offers between players
CREATE TABLE IF NOT EXISTS "TradeOffer" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "fromId"         TEXT NOT NULL,
  "toId"           TEXT NOT NULL,
  "offeredChips"   INTEGER NOT NULL DEFAULT 0,
  "requestedChips" INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "message"        TEXT,
  "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeOffer_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TradeOffer_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TradeOffer_fromId_idx" ON "TradeOffer"("fromId");
CREATE INDEX IF NOT EXISTS "TradeOffer_toId_status_idx" ON "TradeOffer"("toId", "status");

-- Items included in a trade offer (NFTs)
CREATE TABLE IF NOT EXISTS "TradeOfferItem" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "tradeOfferId" TEXT NOT NULL,
  "nftId"        TEXT NOT NULL,
  "side"         TEXT NOT NULL,
  CONSTRAINT "TradeOfferItem_tradeOfferId_fkey" FOREIGN KEY ("tradeOfferId") REFERENCES "TradeOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TradeOfferItem_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "Nft" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Jackpot rounds
CREATE TABLE IF NOT EXISTS "JackpotRound" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "status"     TEXT NOT NULL DEFAULT 'open',
  "totalPot"   INTEGER NOT NULL DEFAULT 0,
  "winnerId"   TEXT,
  "winnerName" TEXT,
  "entries"    TEXT NOT NULL DEFAULT '[]',
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"   DATETIME
);
