/*
  Warnings:

  - A unique constraint covering the columns `[stationId]` on the table `StationPricing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StationPricing_stationId_key" ON "StationPricing"("stationId");
