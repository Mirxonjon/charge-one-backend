/*
  Warnings:

  - A unique constraint covering the columns `[ocppStationId]` on the table `ChargingStation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stationId,connectorNumber]` on the table `Connector` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChargingStation" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3),
ADD COLUMN     "ocppStationId" TEXT;

-- AlterTable
ALTER TABLE "Connector" ADD COLUMN     "connectorNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "ChargingStation_ocppStationId_key" ON "ChargingStation"("ocppStationId");

-- CreateIndex
CREATE INDEX "ChargingStation_ocppStationId_idx" ON "ChargingStation"("ocppStationId");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_stationId_connectorNumber_key" ON "Connector"("stationId", "connectorNumber");
