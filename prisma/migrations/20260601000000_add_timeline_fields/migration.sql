-- Timeline / Decision Tracker fields for GrantApplication
-- All columns are nullable TEXT or TIMESTAMP — safe to add without data loss.
-- Run: npx prisma migrate deploy

ALTER TABLE "GrantApplication" ADD COLUMN "grantType"             TEXT;
ALTER TABLE "GrantApplication" ADD COLUMN "decisionStatus"        TEXT;
ALTER TABLE "GrantApplication" ADD COLUMN "expectedDecisionStart" TIMESTAMP(3);
ALTER TABLE "GrantApplication" ADD COLUMN "expectedDecisionEnd"   TIMESTAMP(3);
ALTER TABLE "GrantApplication" ADD COLUMN "followUpDate"          TIMESTAMP(3);
ALTER TABLE "GrantApplication" ADD COLUMN "contractStatus"        TEXT;
ALTER TABLE "GrantApplication" ADD COLUMN "fundsReceivedStatus"   TEXT;
