-- v2 accounts, parties, and shared roll feed. Additive only.
ALTER TABLE "PlayerCharacter" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
CREATE INDEX IF NOT EXISTS "PlayerCharacter_campaignId_idx" ON "PlayerCharacter"("campaignId");

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL, "username" TEXT NOT NULL, "displayName" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "inviteCode" TEXT NOT NULL, "dmUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_inviteCode_key" ON "Campaign"("inviteCode");

CREATE TABLE IF NOT EXISTS "CampaignMember" (
  "campaignId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'player',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("campaignId", "userId")
);
CREATE INDEX IF NOT EXISTS "CampaignMember_userId_idx" ON "CampaignMember"("userId");

CREATE TABLE IF NOT EXISTS "Roll" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "characterSlug" TEXT, "characterName" TEXT NOT NULL, "userId" TEXT,
  "label" TEXT NOT NULL, "total" INTEGER NOT NULL, "detail" TEXT NOT NULL, "tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Roll_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Roll_campaignId_createdAt_idx" ON "Roll"("campaignId", "createdAt");
