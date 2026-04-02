-- CreateTable
CREATE TABLE "BillAction" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "actionDate" TIMESTAMP(3) NOT NULL,
    "chamber" TEXT,
    "text" TEXT NOT NULL,
    "actionType" TEXT,

    CONSTRAINT "BillAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillAction_billId_idx" ON "BillAction"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "BillAction_billId_actionDate_text_key" ON "BillAction"("billId", "actionDate", "text");

-- AddForeignKey
ALTER TABLE "BillAction" ADD CONSTRAINT "BillAction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
