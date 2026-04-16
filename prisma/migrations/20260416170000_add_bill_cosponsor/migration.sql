-- CreateTable
CREATE TABLE "BillCosponsor" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "representativeId" INTEGER NOT NULL,
    "sponsoredAt" TIMESTAMP(3),
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "BillCosponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillCosponsor_billId_idx" ON "BillCosponsor"("billId");

-- CreateIndex
CREATE INDEX "BillCosponsor_representativeId_idx" ON "BillCosponsor"("representativeId");

-- CreateIndex
CREATE UNIQUE INDEX "BillCosponsor_billId_representativeId_key" ON "BillCosponsor"("billId", "representativeId");

-- AddForeignKey
ALTER TABLE "BillCosponsor" ADD CONSTRAINT "BillCosponsor_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillCosponsor" ADD CONSTRAINT "BillCosponsor_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

