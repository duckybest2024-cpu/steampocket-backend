-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 100000,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientSeed" TEXT NOT NULL DEFAULT 'default-client-seed',
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SeedRotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonceCount" INTEGER NOT NULL,
    "rotatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeedRotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL,
    "multiplier" REAL NOT NULL,
    "state" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RakebackClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RakebackClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrashRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundNumber" INTEGER NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "crashPoint" REAL NOT NULL,
    "state" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_balance_idx" ON "User"("balance");

-- CreateIndex
CREATE INDEX "SeedRotation_userId_idx" ON "SeedRotation"("userId");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_game_idx" ON "Bet"("game");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RakebackClaim_userId_idx" ON "RakebackClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CrashRound_roundNumber_key" ON "CrashRound"("roundNumber");
