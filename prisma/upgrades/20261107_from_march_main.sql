-- Only for databases created by the March 2026 main branch (NextAuth login, campaigns, Roll20, portraits).
-- v2 replaces that build. Run this BEFORE the other upgrade scripts. Back up first.
-- It drops the March auth/campaign/inventory/layout tables (v2 has its own User, Session, Campaign and
-- CampaignMember with different columns) and the legacy ActiveState table. Character, Life and Quirk rows
-- are kept, including the March-only columns (alignment, currencies, portrait, …), which all have defaults.
BEGIN;
DROP TABLE IF EXISTS "Account", "VerificationToken", "CharacterCampaign", "CharacterInventory", "CharacterLayout",
  "ActiveState", "Session", "CampaignMember", "Campaign", "User" CASCADE;
ALTER TABLE "Life" ADD COLUMN IF NOT EXISTS "gameplayState" JSONB;
COMMIT;
