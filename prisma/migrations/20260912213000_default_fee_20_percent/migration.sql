-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "defaultFeePercent" SET DEFAULT 20;
ALTER TABLE "Settings" ALTER COLUMN "defaultFeeFixedMxn" SET DEFAULT 0;

-- Replace leftover MVP defaults (15% + $10) on Settings rows that were never customized.
UPDATE "Settings"
SET "defaultFeePercent" = 20, "defaultFeeFixedMxn" = 0
WHERE "defaultFeePercent" = 15 AND "defaultFeeFixedMxn" = 10;
