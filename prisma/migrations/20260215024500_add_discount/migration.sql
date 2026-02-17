-- CreateTable Discount
CREATE TABLE "Discount" (
  "id" SERIAL PRIMARY KEY,
  "stationId" INTEGER NOT NULL,
  "connectorId" INTEGER,
  "percent" DOUBLE PRECISION,
  "fixedPrice" DECIMAL(10,2),
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Relations
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_station_fkey" FOREIGN KEY ("stationId") REFERENCES "ChargingStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_connector_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "idx_discount_stationId" ON "Discount"("stationId");
CREATE INDEX "idx_discount_connectorId" ON "Discount"("connectorId");

-- Trigger to auto-update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_discount_updated_at
BEFORE UPDATE ON "Discount"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
