-- Momentum signal: surface which bills are actually alive vs dormant vs dead.
-- All columns nullable; compute-momentum backfills on the next cron run.

ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "congressNumber" INTEGER;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "momentumScore" INTEGER;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "momentumTier" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "daysSinceLastAction" INTEGER;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "deathReason" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "momentumComputedAt" TIMESTAMP(3);

-- Backfill congressNumber immediately — it's deterministic from billId and
-- we need it for any momentum computation that checks prior-congress death.
-- billId format: "{billType}-{number}-{congress}" e.g. "house_bill-30-119"
UPDATE "Bill"
SET "congressNumber" = NULLIF(split_part("billId", '-', 3), '')::INTEGER
WHERE "congressNumber" IS NULL
  AND split_part("billId", '-', 3) ~ '^[0-9]+$';

CREATE INDEX IF NOT EXISTS "Bill_momentumTier_momentumScore_idx"
  ON "Bill"("momentumTier", "momentumScore" DESC);

CREATE INDEX IF NOT EXISTS "Bill_congressNumber_idx"
  ON "Bill"("congressNumber");
