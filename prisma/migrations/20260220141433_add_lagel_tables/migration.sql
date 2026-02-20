/*
  Warnings:

  - A unique constraint covering the columns `[stationId]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LegalTranslation" DROP CONSTRAINT "LegalTranslation_documentId_fkey";

-- AlterTable
ALTER TABLE "LegalDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Discount_stationId_key" ON "Discount"("stationId");

-- AddForeignKey
ALTER TABLE "LegalTranslation" ADD CONSTRAINT "LegalTranslation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
