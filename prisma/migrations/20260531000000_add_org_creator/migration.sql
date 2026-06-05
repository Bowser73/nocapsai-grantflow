-- Multi-profile support: track which user created each organization
-- This is a purely additive, non-breaking migration (nullable FK, no defaults changed)

ALTER TABLE "Organization" ADD COLUMN "createdByUserId" TEXT;

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
