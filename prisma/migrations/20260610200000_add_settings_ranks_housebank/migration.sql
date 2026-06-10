-- Add nickname and rank to User
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "rank" TEXT NOT NULL DEFAULT 'bronze';

-- Create HouseBank singleton table
CREATE TABLE "HouseBank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chips" INTEGER NOT NULL DEFAULT 1000000000,
    "dollars" INTEGER NOT NULL DEFAULT 1000000000,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "HouseBank" ("id", "chips", "dollars", "updatedAt")
VALUES ('singleton', 1000000000, 1000000000, CURRENT_TIMESTAMP);

-- Create HouseBankTransaction table
CREATE TABLE "HouseBankTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "chipsChange" INTEGER NOT NULL DEFAULT 0,
    "dollarsChange" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
