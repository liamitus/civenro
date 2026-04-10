-- Catch-up migration: these columns were added to the live database and
-- schema.prisma but never captured in a migration file.

-- AlterTable: Bill metadata columns (all nullable, no data loss)
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "sponsor" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "cosponsorCount" INTEGER;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "cosponsorPartySplit" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "policyArea" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "latestActionText" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "latestActionDate" TIMESTAMP(3);

-- AlterTable: RepresentativeVote category column
ALTER TABLE "RepresentativeVote" ADD COLUMN IF NOT EXISTS "category" TEXT;
