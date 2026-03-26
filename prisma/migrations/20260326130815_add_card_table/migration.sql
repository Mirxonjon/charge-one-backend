-- CreateTable
CREATE TABLE "SavedCard" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardToken" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTransaction" (
    "id" SERIAL NOT NULL,
    "clickTransId" BIGINT NOT NULL,
    "merchantTransId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" INTEGER NOT NULL,
    "signTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedCard_cardToken_key" ON "SavedCard"("cardToken");

-- CreateIndex
CREATE INDEX "SavedCard_userId_idx" ON "SavedCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTransaction_clickTransId_key" ON "ClickTransaction"("clickTransId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickTransaction_merchantTransId_key" ON "ClickTransaction"("merchantTransId");

-- AddForeignKey
ALTER TABLE "SavedCard" ADD CONSTRAINT "SavedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
