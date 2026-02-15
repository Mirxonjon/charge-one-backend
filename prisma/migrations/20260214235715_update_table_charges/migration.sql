-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "Operator" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "contact" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankMfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargingStation" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargingStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "powerKw" DOUBLE PRECISION NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'AVAILABLE',
    "pricePerKwh" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorStatusLog" (
    "id" SERIAL NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "status" "ConnectorStatus" NOT NULL,
    "powerKw" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationPricing" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "idleFee" DOUBLE PRECISION,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargingSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "energyKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorPayout" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChargingStation_operatorId_idx" ON "ChargingStation"("operatorId");

-- CreateIndex
CREATE INDEX "Connector_stationId_idx" ON "Connector"("stationId");

-- CreateIndex
CREATE INDEX "ConnectorStatusLog_connectorId_idx" ON "ConnectorStatusLog"("connectorId");

-- CreateIndex
CREATE INDEX "StationPricing_stationId_idx" ON "StationPricing"("stationId");

-- CreateIndex
CREATE INDEX "ChargingSession_userId_idx" ON "ChargingSession"("userId");

-- CreateIndex
CREATE INDEX "ChargingSession_connectorId_idx" ON "ChargingSession"("connectorId");

-- CreateIndex
CREATE INDEX "OperatorPayout_operatorId_idx" ON "OperatorPayout"("operatorId");

-- AddForeignKey
ALTER TABLE "ChargingStation" ADD CONSTRAINT "ChargingStation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "ChargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorStatusLog" ADD CONSTRAINT "ConnectorStatusLog_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationPricing" ADD CONSTRAINT "StationPricing_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "ChargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargingSession" ADD CONSTRAINT "ChargingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargingSession" ADD CONSTRAINT "ChargingSession_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorPayout" ADD CONSTRAINT "OperatorPayout_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
