-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('OPEN', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PURCHASED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "feePercent" DECIMAL(6,2),
    "feeFixedMxn" DECIMAL(12,2),
    "balanceMxn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enviaTokenEnc" TEXT,
    "enviaEnvironment" TEXT NOT NULL DEFAULT 'sandbox',
    "defaultFeePercent" DECIMAL(6,2) NOT NULL DEFAULT 15,
    "defaultFeeFixedMxn" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "mockMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'envia',
    "status" "QuoteStatus" NOT NULL DEFAULT 'OPEN',
    "request" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRate" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "deliveryEstimate" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "providerCost" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "clientPrice" DECIMAL(12,2) NOT NULL,
    "raw" JSONB,

    CONSTRAINT "QuoteRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "quoteRateId" TEXT,
    "provider" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "serviceName" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelUrl" TEXT,
    "providerShipmentId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "providerCost" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "clientPrice" DECIMAL(12,2) NOT NULL,
    "origin" JSONB NOT NULL,
    "destination" JSONB NOT NULL,
    "packages" JSONB NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerCost" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "clientPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_quoteId_key" ON "Shipment"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_quoteRateId_key" ON "Shipment"("quoteRateId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_shipmentId_key" ON "Sale"("shipmentId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRate" ADD CONSTRAINT "QuoteRate_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_quoteRateId_fkey" FOREIGN KEY ("quoteRateId") REFERENCES "QuoteRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
