-- Create enum StationPowerType
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StationPowerType') THEN
        CREATE TYPE "StationPowerType" AS ENUM ('AC', 'DC', 'MIXED');
    END IF;
END $$;

-- Add column powerType to ChargingStation with default 'AC' then drop default
ALTER TABLE "ChargingStation" ADD COLUMN IF NOT EXISTS "powerType" "StationPowerType";

-- Optional: backfill existing rows to 'AC' if null
UPDATE "ChargingStation" SET "powerType" = 'AC' WHERE "powerType" IS NULL;

-- Index on powerType
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'ChargingStation_powerType_idx'
  ) THEN
    CREATE INDEX "ChargingStation_powerType_idx" ON "ChargingStation" ("powerType");
  END IF;
END $$;