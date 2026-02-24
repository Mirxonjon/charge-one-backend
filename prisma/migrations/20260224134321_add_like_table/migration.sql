-- CreateTable
CREATE TABLE "StationLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StationLike_stationId_idx" ON "StationLike"("stationId");

-- CreateIndex
CREATE INDEX "StationLike_userId_idx" ON "StationLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StationLike_userId_stationId_key" ON "StationLike"("userId", "stationId");

-- AddForeignKey
ALTER TABLE "StationLike" ADD CONSTRAINT "StationLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationLike" ADD CONSTRAINT "StationLike_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "ChargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
