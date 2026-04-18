-- Track when fetch-bill-text last ran against a bill (success or failure).
-- The text backfill cron orders by this ASC NULLS FIRST so bills we
-- can't get text for rotate to the back of the queue instead of blocking
-- all other bills behind them. Before this column the cron was oldest-first
-- by introducedDate with no retry-attempt tracking, which meant the same
-- 6 permanently-unpublished bills (e.g. H.R. 6833) blocked the queue
-- forever.
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "textFetchAttemptedAt" TIMESTAMP(3);

-- Partial index: the cursor only cares about bills missing text. Indexing
-- the whole table wastes space on the ~7% of bills that already have text.
CREATE INDEX IF NOT EXISTS "Bill_textFetchAttemptedAt_missing_text_idx"
  ON "Bill" ("textFetchAttemptedAt" ASC NULLS FIRST)
  WHERE "fullText" IS NULL;
