/*
  Warnings:

  - A unique constraint covering the columns `[qrCode]` on the table `Connector` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Connector" ADD COLUMN     "qrCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Connector_qrCode_key" ON "Connector"("qrCode");
