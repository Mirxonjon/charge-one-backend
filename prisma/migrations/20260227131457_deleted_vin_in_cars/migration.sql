/*
  Warnings:

  - You are about to drop the column `vin` on the `Car` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Car_vin_key";

-- DropIndex
DROP INDEX "UserDevice_deviceToken_key";

-- AlterTable
ALTER TABLE "Car" DROP COLUMN "vin";
