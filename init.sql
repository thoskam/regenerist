-- Create the Character table
CREATE TABLE IF NOT EXISTS "Character" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "isRegenerist" BOOLEAN NOT NULL DEFAULT true,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create the Life table for The Regenerist
CREATE TABLE IF NOT EXISTS "Life" (
    "id" SERIAL PRIMARY KEY,
    "lifeNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "subclass" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "stats" JSONB NOT NULL,
    "baseStats" JSONB,
    "spellbook" JSONB,
    "gameplayState" JSONB,
    "currentHp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "skillProficiencies" TEXT[] DEFAULT '{}',
    "subclassChoice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "characterId" INTEGER NOT NULL,
    CONSTRAINT "Life_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Life_characterId_lifeNumber_key" UNIQUE ("characterId", "lifeNumber")
);

-- Create the Quirk table
CREATE TABLE IF NOT EXISTS "Quirk" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Life_characterId_idx" ON "Life"("characterId");
CREATE INDEX IF NOT EXISTS "Character_slug_idx" ON "Character"("slug");

-- Seed default quirks from the original effects
INSERT INTO "Quirk" ("name", "description") VALUES
    ('System Shock', 'Stunned for 1 round as your brain re-wires.'),
    ('Finger Obsession', 'You count your fingers obsessively. Disadvantage on Initiative.'),
    ('Muscle Memory Mismatch', 'Your first attack roll is an automatic 1.'),
    ('Sensory Overload', 'Disadvantage on Perception checks for 10 minutes.'),
    ('New Face, Who Dis?', 'You don''t recognize your allies for 1d4 minutes.'),
    ('Hyper-Active', 'Gain the effects of Haste for 2 rounds, then suffer 1 level of Exhaustion.'),
    ('Elemental Leak', 'Your first successful hit deals an extra 2d6 Force damage.'),
    ('Appetite Shift', 'You have an overwhelming urge to eat something non-edible nearby.'),
    ('Foreign Tongue', 'You speak a random language (DM''s choice) exclusively for 1 hour.'),
    ('Total Amnesia', 'You forget your name entirely but retain all skills and abilities.'),
    ('Aura of Luck', 'Gain a Regeneration Inspiration die (1d10) usable on any roll.'),
    ('Gravitational Glitch', 'You hover 1 inch off the ground for 10 minutes. Cannot trigger pressure plates.'),
    ('Personality Flip', 'Your personality traits temporarily flip to their opposite.'),
    ('Combat Instincts', 'You must immediately take the Attack action upon waking.'),
    ('Fragile Form', 'Your Maximum HP is reduced by 5 until your next long rest.'),
    ('Vocal Shift', 'Your voice is 3 octaves higher or lower (50/50 chance) for 1 hour.'),
    ('Burst of Life', 'Allies within 10 feet heal 2d10 HP. You feel drained.'),
    ('The Sleepy Regenerist', 'DC 10 Wisdom save or fall asleep for 1 minute.'),
    ('Perfect Sync', 'Advantage on your next 3 d20 rolls.'),
    ('The Chosen One', 'Gain 1 free Feat of your choice until your next death.')
ON CONFLICT DO NOTHING;

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

-- v2: keep the D&D Beyond import when a character is converted to a builder character (undo). Additive only.
ALTER TABLE "PlayerCharacter" ADD COLUMN IF NOT EXISTS "importBackup" JSONB;
