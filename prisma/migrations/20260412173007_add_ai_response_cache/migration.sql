-- CreateTable
CREATE TABLE "AiResponseCache" (
    "id" TEXT NOT NULL,
    "billId" INTEGER NOT NULL,
    "promptHash" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiResponseCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiResponseCache_expiresAt_idx" ON "AiResponseCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiResponseCache_billId_promptHash_key" ON "AiResponseCache"("billId", "promptHash");
