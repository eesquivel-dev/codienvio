-- CreateEnum
CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED');

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "mercadopagoPaymentId" TEXT;

-- CreateTable
CREATE TABLE "WalletTopUp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountMxn" DECIMAL(12,2) NOT NULL,
    "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING',
    "preferenceId" TEXT,
    "mercadopagoPaymentId" TEXT,
    "walletTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_mercadopagoPaymentId_key" ON "WalletTransaction"("mercadopagoPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopUp_mercadopagoPaymentId_key" ON "WalletTopUp"("mercadopagoPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopUp_walletTxnId_key" ON "WalletTopUp"("walletTxnId");

-- CreateIndex
CREATE INDEX "WalletTopUp_clientId_createdAt_idx" ON "WalletTopUp"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_walletTxnId_fkey" FOREIGN KEY ("walletTxnId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
