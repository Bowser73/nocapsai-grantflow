-- ============================================================================
-- RECONCILIATION MIGRATION — DO NOT RUN DIRECTLY AGAINST THE DATABASE
-- ============================================================================
-- These changes were applied to the Neon database via `prisma db push` during
-- development but were never captured in a migration file. The database already
-- has all of these changes.
--
-- To register this migration as applied WITHOUT re-running it against the DB:
--   npx prisma migrate resolve --applied 20260531000001_reconcile_db_push
--
-- After that, run: npx prisma migrate deploy
-- That will apply only the pending 20260531000000_add_org_creator migration.
-- ============================================================================

-- GrantOpportunity: externalId column + unique index (added via db push for Grants.gov upsert dedup)
ALTER TABLE "GrantOpportunity" ADD COLUMN "externalId" TEXT;
ALTER TABLE "GrantOpportunity" ADD COLUMN "originSource" TEXT NOT NULL DEFAULT 'SEED';
CREATE UNIQUE INDEX "GrantOpportunity_externalId_key" ON "GrantOpportunity"("externalId");

-- Notification: type column was present in init migration but removed via db push
ALTER TABLE "Notification" DROP COLUMN "type";

-- Notification: opportunityId column was added via db push
ALTER TABLE "Notification" ADD COLUMN "opportunityId" TEXT;

-- Notification: userId+isRead composite index was created by init migration but dropped via db push
DROP INDEX "Notification_userId_isRead_idx";
