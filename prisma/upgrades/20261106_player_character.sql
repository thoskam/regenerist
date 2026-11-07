-- v2 character sheets. Additive: existing Character/Life/Quirk tables are untouched.
CREATE TABLE IF NOT EXISTS "PlayerCharacter" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "doc" JSONB NOT NULL,
  "state" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "avatar" BYTEA,
  "avatarType" TEXT,
  "ddbId" TEXT,
  "ownerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerCharacter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerCharacter_slug_key" ON "PlayerCharacter"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerCharacter_ddbId_key" ON "PlayerCharacter"("ddbId");
CREATE INDEX IF NOT EXISTS "PlayerCharacter_ownerId_idx" ON "PlayerCharacter"("ownerId");
