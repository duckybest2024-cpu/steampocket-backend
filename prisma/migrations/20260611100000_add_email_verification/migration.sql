-- Add email verification fields (use INTEGER 0/1 for SQLite boolean compatibility)
ALTER TABLE "User" ADD COLUMN "emailVerified" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "emailToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailTokenExpiry" DATETIME;

-- Existing accounts are grandfathered in as verified so they are not locked out
UPDATE "User" SET "emailVerified" = 1;
