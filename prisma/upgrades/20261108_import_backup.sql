-- v2: keep the D&D Beyond import when a character is converted to a builder character (undo). Additive only.
ALTER TABLE "PlayerCharacter" ADD COLUMN IF NOT EXISTS "importBackup" JSONB;
