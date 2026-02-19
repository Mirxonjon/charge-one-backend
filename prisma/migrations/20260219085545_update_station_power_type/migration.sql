/*
  Warnings:

  - The values [MIXED] on the enum `StationPowerType` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `powerType` on table `ChargingStation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StationPowerType_new" AS ENUM ('AC', 'DC', 'HYBRID', 'ULTRA');
ALTER TABLE "ChargingStation" ALTER COLUMN "powerType" TYPE "StationPowerType_new" USING ("powerType"::text::"StationPowerType_new");
ALTER TYPE "StationPowerType" RENAME TO "StationPowerType_old";
ALTER TYPE "StationPowerType_new" RENAME TO "StationPowerType";
DROP TYPE "StationPowerType_old";
COMMIT;

-- DropIndex
DROP INDEX "ChargingStation_powerType_idx";

-- AlterTable
ALTER TABLE "ChargingStation" ALTER COLUMN "powerType" SET NOT NULL;
