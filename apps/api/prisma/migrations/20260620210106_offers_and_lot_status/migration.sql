-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('em_desenvolvimento', 'colhido', 'em_beneficiamento', 'disponivel', 'ofertado', 'vendido');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('disponivel', 'em_negociacao', 'contratada', 'cancelada');

-- AlterTable
ALTER TABLE "FieldReading" ADD COLUMN     "availableSacks" DECIMAL(65,30),
ADD COLUMN     "status" "LotStatus" NOT NULL DEFAULT 'colhido',
ADD COLUMN     "storedMoisturePct" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "fieldReadingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grainType" "GrainType" NOT NULL,
    "harvestYear" TEXT NOT NULL,
    "quantitySacks" DECIMAL(65,30) NOT NULL,
    "askingPriceCents" BIGINT,
    "status" "OfferStatus" NOT NULL DEFAULT 'disponivel',
    "notes" TEXT,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_contractId_key" ON "Offer"("contractId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_sellerId_idx" ON "Offer"("sellerId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_fieldReadingId_fkey" FOREIGN KEY ("fieldReadingId") REFERENCES "FieldReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
