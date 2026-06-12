-- Add flagging fields to User
ALTER TABLE "User" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "flagReason" TEXT;
ALTER TABLE "User" ADD COLUMN "flaggedAt" DATETIME;

-- Case openings log
CREATE TABLE "CaseOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "paidChips" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CaseOpening_userId_idx" ON "CaseOpening"("userId");
CREATE INDEX "CaseOpening_caseId_idx" ON "CaseOpening"("caseId");

-- Anti-cheat events
CREATE TABLE "AnticheatEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AnticheatEvent_userId_idx" ON "AnticheatEvent"("userId");
CREATE INDEX "AnticheatEvent_resolved_idx" ON "AnticheatEvent"("resolved");

-- NFT P2P listings
CREATE TABLE "NftListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nftId" TEXT NOT NULL UNIQUE,
    "sellerId" TEXT NOT NULL,
    "priceChips" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "buyerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" DATETIME
);
CREATE INDEX "NftListing_sellerId_idx" ON "NftListing"("sellerId");
CREATE INDEX "NftListing_status_idx" ON "NftListing"("status");
