-- Additive upgrade for existing Regenerist databases. Back up before applying.
-- Safe to repeat; leaves character rows, life history, and existing stats intact.
BEGIN;
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "isRegenerist" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "baseStats" JSONB;
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "spellbook" JSONB;
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "gameplayState" JSONB;
COMMIT;
