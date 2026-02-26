/*
  Warnings:

  - A unique constraint covering the columns `[deviceToken]` on the table `UserDevice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserDevice_userId_deviceToken_key";

-- DropIndex
DROP INDEX "UserDevice_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_deviceToken_key" ON "UserDevice"("deviceToken");
