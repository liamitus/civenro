-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "textVersionId" INTEGER,
ADD COLUMN     "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "BillTextVersion" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "versionCode" TEXT NOT NULL,
    "versionType" TEXT NOT NULL,
    "versionDate" TIMESTAMP(3) NOT NULL,
    "fullText" TEXT,
    "isSubstantive" BOOLEAN NOT NULL DEFAULT true,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillTextVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteHistory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "billId" INTEGER NOT NULL,
    "voteType" TEXT NOT NULL,
    "textVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillTextVersion_billId_idx" ON "BillTextVersion"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "BillTextVersion_billId_versionCode_key" ON "BillTextVersion"("billId", "versionCode");

-- CreateIndex
CREATE INDEX "VoteHistory_userId_billId_idx" ON "VoteHistory"("userId", "billId");

-- CreateIndex
CREATE INDEX "VoteHistory_billId_idx" ON "VoteHistory"("billId");

-- AddForeignKey
ALTER TABLE "BillTextVersion" ADD CONSTRAINT "BillTextVersion_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_textVersionId_fkey" FOREIGN KEY ("textVersionId") REFERENCES "BillTextVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteHistory" ADD CONSTRAINT "VoteHistory_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteHistory" ADD CONSTRAINT "VoteHistory_textVersionId_fkey" FOREIGN KEY ("textVersionId") REFERENCES "BillTextVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
