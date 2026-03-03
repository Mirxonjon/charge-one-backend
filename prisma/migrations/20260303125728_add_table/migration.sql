/*
  Warnings:

  - You are about to drop the column `type` on the `Connector` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Connector" DROP COLUMN "type",
ADD COLUMN     "pricePerKwh" DOUBLE PRECISION,
ADD COLUMN     "typeId" INTEGER;

-- CreateTable
CREATE TABLE "ConnectorType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConnectorToConnectorType" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorType_name_key" ON "ConnectorType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ConnectorToConnectorType_AB_unique" ON "_ConnectorToConnectorType"("A", "B");

-- CreateIndex
CREATE INDEX "_ConnectorToConnectorType_B_index" ON "_ConnectorToConnectorType"("B");

-- AddForeignKey
ALTER TABLE "_ConnectorToConnectorType" ADD CONSTRAINT "_ConnectorToConnectorType_A_fkey" FOREIGN KEY ("A") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConnectorToConnectorType" ADD CONSTRAINT "_ConnectorToConnectorType_B_fkey" FOREIGN KEY ("B") REFERENCES "ConnectorType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
