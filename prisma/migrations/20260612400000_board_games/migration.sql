CREATE TABLE "BoardGameRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "game" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "betChips" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 2,
    "players" TEXT NOT NULL DEFAULT '[]',
    "winnerId" TEXT,
    "state" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "BoardGameRoom_game_status_idx" ON "BoardGameRoom"("game", "status");
