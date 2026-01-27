-- Create the Life table for The Regenerist
CREATE TABLE IF NOT EXISTS "Life" (
    "id" SERIAL PRIMARY KEY,
    "lifeNumber" INTEGER NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "subclass" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "stats" JSONB NOT NULL,
    "baseStats" JSONB,
    "currentHp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "skillProficiencies" TEXT[] DEFAULT '{}',
    "subclassChoice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false
);

-- Migration for existing databases
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "skillProficiencies" TEXT[] DEFAULT '{}';
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "subclassChoice" TEXT;
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "baseStats" JSONB;
