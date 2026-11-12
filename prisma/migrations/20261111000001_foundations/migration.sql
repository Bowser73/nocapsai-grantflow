-- Foundations: grantmaking organizations from public IRS data.
-- Additive and safe to re-run.
CREATE TABLE IF NOT EXISTS "Foundation" (
    "ein" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "careOf" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "kind" TEXT NOT NULL,
    "foundationCode" TEXT,
    "nteeCode" TEXT,
    "rulingYear" INTEGER,
    "taxPeriod" TEXT,
    "assets" BIGINT,
    "income" BIGINT,
    "revenue" BIGINT,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Foundation_pkey" PRIMARY KEY ("ein")
);

CREATE INDEX IF NOT EXISTS "Foundation_state_assets_idx" ON "Foundation"("state", "assets");
CREATE INDEX IF NOT EXISTS "Foundation_name_idx" ON "Foundation"("name");
