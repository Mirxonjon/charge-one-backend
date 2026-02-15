-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'CHARGE', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CLICK', 'PAYME', 'CARD');

-- CreateTable Wallet
CREATE TABLE "Wallet" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE,
  "balance" DECIMAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- FK Wallet.userId -> User.id
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable WalletTransaction
CREATE TABLE "WalletTransaction" (
  "id" SERIAL PRIMARY KEY,
  "walletId" INTEGER NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL NOT NULL,
  "provider" TEXT,
  "sessionId" INTEGER,
  "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX "WalletTransaction_sessionId_idx" ON "WalletTransaction"("sessionId");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChargingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Payment
CREATE TABLE "Payment" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" INTEGER NOT NULL UNIQUE,
  "amount" DECIMAL NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChargingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
