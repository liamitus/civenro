-- Post-deploy backfill driver — run AFTER the parser fix is live in prod.
--
-- Why this file is NOT a Prisma migration:
--   These statements don't change schema; they invalidate cached data so
--   the GitHub-Actions cron re-parses ~1,000 bills with the new code.
--   Running this BEFORE deployment would cause the still-old cron to
--   re-cache broken text and undo the fix. Run AFTER deploy confirmation.
--
-- Triggers these crons to drain the backlog:
--   - backfill-bill-text         (hourly)  → re-downloads + re-parses XML
--   - backfill-bill-actions      (every 2h) → backfills the 227 missing-actions bills
--   - backfill-cosponsors        (every 2h) → now catches partial-data bills too
--   - refresh-bill-metadata      (every 6h) → picks up bills whose shortText is null
--
-- Expected drain time at current cron batch sizes:
--   - ~64 runs × 1h = ~3 days for bill text
--   - ~1 day for cosponsor gaps
--   - continuous for CRS summaries (not stuck, just waits on CRS publication)

BEGIN;

-- 1. Invalidate cached bill text for amendment-heavy bills so the backfill
--    re-downloads them and re-parses with the new <quoted-block>-aware code.
--    "the following" is the amendment-insertion marker; 957 bills in the
--    audit sample contained it.
UPDATE "BillTextVersion"
SET "fullText" = NULL
WHERE "fullText" ILIKE '%the following%';

UPDATE "Bill"
SET "fullText" = NULL
WHERE "fullText" ILIKE '%the following%';

-- 2. Invalidate change summaries on bills whose underlying text is being
--    re-parsed — the prior summaries were based on truncated text.
UPDATE "BillTextVersion"
SET "changeSummary" = NULL
WHERE "billId" IN (
  SELECT DISTINCT "billId"
  FROM "BillTextVersion"
  WHERE "fullText" IS NULL
);

-- 3. Clear lastMetadataRefreshAt on live bills that still lack a CRS summary.
--    The pre-fix cooldown stamped on null-summary fetches locked these out
--    for 14 days; clearing the stamp lets refresh-bill-metadata pick them
--    up on its next tick.
UPDATE "Bill"
SET "lastMetadataRefreshAt" = NULL
WHERE "shortText" IS NULL
  AND "momentumTier" IN ('ACTIVE', 'ADVANCING', 'ENACTED');

COMMIT;
