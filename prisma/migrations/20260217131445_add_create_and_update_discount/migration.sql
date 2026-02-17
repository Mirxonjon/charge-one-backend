-- CreateTable
CREATE TABLE "Discount" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "connectorId" INTEGER,
    "percent" DOUBLE PRECISION,
    "fixedPrice" DECIMAL(10,2),
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discount_stationId_idx" ON "Discount"("stationId");

-- CreateIndex
CREATE INDEX "Discount_connectorId_idx" ON "Discount"("connectorId");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "ChargingStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
