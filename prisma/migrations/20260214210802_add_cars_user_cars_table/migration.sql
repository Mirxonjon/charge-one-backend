-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "vin" TEXT,
    "batterySize" DOUBLE PRECISION,
    "rangeKm" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCar" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "plateNumber" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Car_vin_key" ON "Car"("vin");

-- CreateIndex
CREATE INDEX "Car_brand_idx" ON "Car"("brand");

-- CreateIndex
CREATE INDEX "Car_model_idx" ON "Car"("model");

-- CreateIndex
CREATE INDEX "Car_year_idx" ON "Car"("year");

-- CreateIndex
CREATE UNIQUE INDEX "UserCar_plateNumber_key" ON "UserCar"("plateNumber");

-- CreateIndex
CREATE INDEX "UserCar_userId_idx" ON "UserCar"("userId");

-- CreateIndex
CREATE INDEX "UserCar_carId_idx" ON "UserCar"("carId");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
