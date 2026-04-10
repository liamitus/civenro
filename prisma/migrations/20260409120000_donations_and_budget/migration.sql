
-- CreateEnum
CREATE TYPE "DonationDisplayMode" AS ENUM ('ANONYMOUS', 'NAMED', 'TRIBUTE');

-- CreateEnum
CREATE TYPE "DonationModStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'GRACE', 'LAPSED', 'CANCELED');

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "userId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringStatus" "RecurringStatus",
    "displayMode" "DonationDisplayMode" NOT NULL DEFAULT 'ANONYMOUS',
    "displayName" TEXT,
    "displayNameRaw" TEXT,
    "tributeName" TEXT,
    "tributeNameRaw" TEXT,
    "moderationStatus" "DonationModStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "regionCode" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorLinkToken" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLedger" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "incomeCents" INTEGER NOT NULL DEFAULT 0,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "reserveCents" INTEGER NOT NULL DEFAULT 0,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiDisabledReason" TEXT,
    "lastEvaluated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripePaymentId_key" ON "Donation"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

-- CreateIndex
CREATE INDEX "Donation_userId_idx" ON "Donation"("userId");

-- CreateIndex
CREATE INDEX "Donation_isRecurring_recurringStatus_idx" ON "Donation"("isRecurring", "recurringStatus");

-- CreateIndex
CREATE INDEX "Donation_moderationStatus_idx" ON "Donation"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DonorLinkToken_donationId_key" ON "DonorLinkToken"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "DonorLinkToken_token_key" ON "DonorLinkToken"("token");

-- CreateIndex
CREATE INDEX "DonorLinkToken_token_idx" ON "DonorLinkToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLedger_period_key" ON "BudgetLedger"("period");

-- CreateIndex
CREATE INDEX "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_feature_createdAt_idx" ON "AiUsageEvent"("feature", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE INDEX "AdminUser_userId_idx" ON "AdminUser"("userId");

-- AddForeignKey
ALTER TABLE "DonorLinkToken" ADD CONSTRAINT "DonorLinkToken_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

