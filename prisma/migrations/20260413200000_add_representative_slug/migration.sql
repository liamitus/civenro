-- AlterTable
ALTER TABLE "Representative" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Representative_slug_key" ON "Representative"("slug");
