-- Track when each account was last active (shown to admins on the Accounts page).
-- Backfills from existing sessions, so anyone signed in before this shows up too.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
UPDATE "User" u SET "lastSeenAt" = s.last FROM (SELECT "userId", max("createdAt") AS last FROM "Session" GROUP BY "userId") s
WHERE s."userId" = u.id AND u."lastSeenAt" IS NULL;
