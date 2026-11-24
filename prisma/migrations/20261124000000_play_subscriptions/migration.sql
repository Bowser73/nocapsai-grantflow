CREATE TABLE IF NOT EXISTS "PlaySubscription" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "tokenHash" TEXT NOT NULL, "encryptedToken" TEXT NOT NULL, "state" TEXT NOT NULL, "expiresAt" TIMESTAMP(3), "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "PlaySubscription_tokenHash_key" ON "PlaySubscription"("tokenHash");
CREATE INDEX IF NOT EXISTS "PlaySubscription_userId_idx" ON "PlaySubscription"("userId");
CREATE TABLE IF NOT EXISTS "AIContentReport" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "sectionId" TEXT NOT NULL, "reason" TEXT NOT NULL, "note" TEXT, "contentSnapshot" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "AIContentReport_userId_createdAt_idx" ON "AIContentReport"("userId", "createdAt");
