-- Add bank balance column to User table for the chip buy/cashout system
ALTER TABLE "User" ADD COLUMN "bank" INTEGER NOT NULL DEFAULT 0;
