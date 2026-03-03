/*
  Warnings:

  - You are about to drop the `_ConnectorToConnectorType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ConnectorToConnectorType" DROP CONSTRAINT "_ConnectorToConnectorType_A_fkey";

-- DropForeignKey
ALTER TABLE "_ConnectorToConnectorType" DROP CONSTRAINT "_ConnectorToConnectorType_B_fkey";

-- DropTable
DROP TABLE "_ConnectorToConnectorType";

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ConnectorType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
