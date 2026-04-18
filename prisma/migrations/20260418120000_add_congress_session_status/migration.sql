-- "Is Congress working right now?" status indicator.
--
-- Two tables:
--   1. CongressChamberStatus — live per-chamber computed state, upserted
--      every ~10 minutes by the compute-congress-status cron.
--   2. CongressRecess — static per-year publisher recess calendar,
--      seeded from House Majority Leader + Senate calendars, used as
--      waterfall fallback when live scrapers can't resolve today.
--
-- Both tables get RLS enabled with zero policies. Govroll queries these
-- via Prisma (postgres superuser bypasses RLS), while PostgREST / anon
-- key access is denied — matching the whole-schema RLS posture from
-- 20260414150000_enable_rls_on_all_tables.

-- CreateTable
CREATE TABLE "CongressChamberStatus" (
    "chamber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "source" TEXT NOT NULL,
    "lastActionAt" TIMESTAMP(3),
    "nextTransitionAt" TIMESTAMP(3),
    "nextTransitionLabel" TEXT,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CongressChamberStatus_pkey" PRIMARY KEY ("chamber")
);

-- CreateTable
CREATE TABLE "CongressRecess" (
    "id" TEXT NOT NULL,
    "chamber" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CongressRecess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CongressRecess_chamber_startDate_endDate_idx" ON "CongressRecess"("chamber", "startDate", "endDate");

-- RLS: deny all via PostgREST (anon key), app reads go through Prisma.
ALTER TABLE "CongressChamberStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CongressRecess" ENABLE ROW LEVEL SECURITY;
