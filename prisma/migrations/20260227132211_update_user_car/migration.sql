/*
  Warnings:

  - A unique constraint covering the columns `[vin]` on the table `UserCar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserCar" ADD COLUMN     "vin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserCar_vin_key" ON "UserCar"("vin");
