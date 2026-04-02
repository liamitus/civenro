-- AlterTable
ALTER TABLE "RepresentativeVote" ADD COLUMN IF NOT EXISTS "rollCallNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "chamber" TEXT,
ADD COLUMN IF NOT EXISTS "votedAt" TIMESTAMP(3);

-- Drop old unique index
DROP INDEX IF EXISTS "RepresentativeVote_representativeId_billId_key";

-- CreateIndex (new unique constraint including rollCallNumber)
CREATE UNIQUE INDEX "RepresentativeVote_representativeId_billId_rollCallNumber_key" ON "RepresentativeVote"("representativeId", "billId", "rollCallNumber");

-- CreateIndex
CREATE INDEX "RepresentativeVote_billId_chamber_idx" ON "RepresentativeVote"("billId", "chamber");

-- CreateIndex
CREATE INDEX "RepresentativeVote_billId_rollCallNumber_idx" ON "RepresentativeVote"("billId", "rollCallNumber");
