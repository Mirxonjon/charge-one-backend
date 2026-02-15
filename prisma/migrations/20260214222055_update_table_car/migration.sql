-- CreateEnum
CREATE TYPE "CarCreatedByType" AS ENUM ('ADMIN', 'USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "createdByType" "CarCreatedByType" NOT NULL DEFAULT 'SYSTEM';

-- CreateIndex
CREATE INDEX "Car_createdByType_idx" ON "Car"("createdByType");

-- CreateIndex
CREATE INDEX "Car_createdById_idx" ON "Car"("createdById");
