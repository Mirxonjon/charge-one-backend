-- AlterTable
ALTER TABLE "ChargingSession" ADD COLUMN     "userCarId" INTEGER;

-- AddForeignKey
ALTER TABLE "ChargingSession" ADD CONSTRAINT "ChargingSession_userCarId_fkey" FOREIGN KEY ("userCarId") REFERENCES "UserCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
