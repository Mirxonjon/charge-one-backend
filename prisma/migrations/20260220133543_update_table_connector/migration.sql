/*
  Warnings:

  - You are about to drop the column `pricePerKwh` on the `Connector` table. All the data in the column will be lost.
  - You are about to drop the column `connectorId` on the `Discount` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Discount" DROP CONSTRAINT "Discount_connectorId_fkey";

-- DropIndex
DROP INDEX "Discount_connectorId_idx";

-- AlterTable
ALTER TABLE "Connector" DROP COLUMN "pricePerKwh";

-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "connectorId";
