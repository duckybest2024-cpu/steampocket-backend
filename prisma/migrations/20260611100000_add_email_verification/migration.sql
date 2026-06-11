-- Add email verification fields
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailTokenExpiry" DATETIME;

-- Existing accounts are grandfathered in as verified so they are not locked out
UPDATE "User" SET "emailVerified" = true;
