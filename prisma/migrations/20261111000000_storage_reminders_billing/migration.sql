-- Document storage in the database, reminder de-duplication, and billing fields.
-- Purely additive and written to be safe to re-run: older app code keeps working
-- against a database that has these changes, so apply this BEFORE deploying the
-- code that uses it.

-- Notification: reminder de-duplication key
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "emailPending" BOOLEAN NOT NULL DEFAULT false;

-- User: reminder preference + billing
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

-- DocumentBlob: uploaded file contents
CREATE TABLE IF NOT EXISTS "DocumentBlob" (
    "documentId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentBlob_pkey" PRIMARY KEY ("documentId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_emailPending_idx" ON "Notification"("emailPending");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DocumentBlob_documentId_fkey'
  ) THEN
    ALTER TABLE "DocumentBlob"
      ADD CONSTRAINT "DocumentBlob_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "OrganizationDocument"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Accounts that existed before billing launched keep full access at no charge.
-- New sign-ups after this migration start on the FREE plan (the column default).
-- Guarded so re-running never downgrades or re-grants anyone.
UPDATE "User" SET "plan" = 'COMP'
WHERE "plan" = 'FREE'
  AND "stripeCustomerId" IS NULL
  AND "createdAt" < TIMESTAMP '2026-11-12 12:00:00';
