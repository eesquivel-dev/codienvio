-- CreateEnum
CREATE TYPE "SavedAddressType" AS ENUM ('ORIGIN', 'DESTINATION', 'BOTH');

-- CreateTable
CREATE TABLE "SavedAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SavedAddressType" NOT NULL DEFAULT 'BOTH',
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "reference" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPackage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'box',
    "content" TEXT NOT NULL,
    "weightKg" DECIMAL(8,2) NOT NULL,
    "lengthCm" DECIMAL(8,1) NOT NULL,
    "widthCm" DECIMAL(8,1) NOT NULL,
    "heightCm" DECIMAL(8,1) NOT NULL,
    "declaredValueMxn" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedAddress_clientId_updatedAt_idx" ON "SavedAddress"("clientId", "updatedAt");

-- CreateIndex
CREATE INDEX "SavedAddress_clientId_type_idx" ON "SavedAddress"("clientId", "type");

-- CreateIndex
CREATE INDEX "SavedPackage_clientId_updatedAt_idx" ON "SavedPackage"("clientId", "updatedAt");

-- AddForeignKey
ALTER TABLE "SavedAddress" ADD CONSTRAINT "SavedAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPackage" ADD CONSTRAINT "SavedPackage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
