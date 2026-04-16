-- Add phone column to Representative for tap-to-call on rep cards
ALTER TABLE "Representative" ADD COLUMN IF NOT EXISTS "phone" TEXT;
