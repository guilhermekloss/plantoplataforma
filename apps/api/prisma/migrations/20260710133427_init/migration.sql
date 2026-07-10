-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('COOPERATIVE', 'TRADING', 'PRODUCER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'PRODUCER');

-- CreateEnum
CREATE TYPE "Crop" AS ENUM ('SOJA', 'MILHO', 'TRIGO');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('RASCUNHO', 'PENDENTE_ASSINATURA', 'ASSINADO', 'ENTREGA_PARCIAL', 'LIQUIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ContractEventType" AS ENUM ('CRIADO', 'STATUS_ALTERADO', 'ENTREGA_REGISTRADA', 'LAUDO_ADICIONADO', 'PAGAMENTO_LIBERADO', 'ASSINADO');

-- CreateEnum
CREATE TYPE "GradeClass" AS ENUM ('TIPO_1', 'TIPO_2', 'TIPO_3', 'FORA_DE_TIPO');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ABERTA', 'EM_NEGOCIACAO', 'CONVERTIDA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "LoteStatus" AS ENUM ('PLANTADO', 'COLHIDO', 'BENEFICIAMENTO', 'DISPONIVEL', 'OFERTADO', 'VENDIDO');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "cnpj" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "buyerOrgId" TEXT NOT NULL,
    "sellerOrgId" TEXT NOT NULL,
    "crop" "Crop" NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "pricePerSc60Cents" INTEGER NOT NULL,
    "totalValueCents" INTEGER NOT NULL,
    "deliveryDeadline" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'RASCUNHO',
    "contractHash" TEXT,
    "signedByBuyerAt" TIMESTAMP(3),
    "signedBySellerAt" TIMESTAMP(3),
    "agronomicData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "ContractEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "actorUserId" TEXT,
    "blockchainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "registeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "moisturePct" DOUBLE PRECISION NOT NULL,
    "impuritiesPct" DOUBLE PRECISION NOT NULL,
    "brokenGrainsPct" DOUBLE PRECISION NOT NULL,
    "gradeClass" "GradeClass" NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL,
    "discountValueCents" INTEGER NOT NULL,
    "finalValueCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldReading" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "crop" "Crop" NOT NULL,
    "season" TEXT NOT NULL,
    "yieldScHa" DOUBLE PRECISION,
    "harvestMoisture" DOUBLE PRECISION,
    "ndvi" DOUBLE PRECISION,
    "soilData" JSONB,
    "plantPopulation" INTEGER,
    "rainfallMm" DOUBLE PRECISION,
    "gddAccumulated" DOUBLE PRECISION,
    "avgTempC" DOUBLE PRECISION,
    "frostEvents" INTEGER,
    "machineData" JSONB,
    "yieldMap" JSONB,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "crop" "Crop" NOT NULL,
    "season" TEXT NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "status" "LoteStatus" NOT NULL DEFAULT 'PLANTADO',
    "beneficiamentoLocal" TEXT,
    "beneficiamentoData" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "loteId" TEXT,
    "crop" "Crop" NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "expectedPriceCents" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'ABERTA',
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContractSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "_FieldReadingToLote" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cnpj_key" ON "Organization"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE INDEX "Contract_buyerOrgId_idx" ON "Contract"("buyerOrgId");

-- CreateIndex
CREATE INDEX "Contract_sellerOrgId_idx" ON "Contract"("sellerOrgId");

-- CreateIndex
CREATE INDEX "ContractEvent_contractId_idx" ON "ContractEvent"("contractId");

-- CreateIndex
CREATE INDEX "Delivery_contractId_idx" ON "Delivery"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReport_deliveryId_key" ON "QualityReport"("deliveryId");

-- CreateIndex
CREATE INDEX "FieldReading_organizationId_idx" ON "FieldReading"("organizationId");

-- CreateIndex
CREATE INDEX "Lote_organizationId_idx" ON "Lote"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_contractId_key" ON "Offer"("contractId");

-- CreateIndex
CREATE INDEX "Offer_organizationId_idx" ON "Offer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "_FieldReadingToLote_AB_unique" ON "_FieldReadingToLote"("A", "B");

-- CreateIndex
CREATE INDEX "_FieldReadingToLote_B_index" ON "_FieldReadingToLote"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_sellerOrgId_fkey" FOREIGN KEY ("sellerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReading" ADD CONSTRAINT "FieldReading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FieldReadingToLote" ADD CONSTRAINT "_FieldReadingToLote_A_fkey" FOREIGN KEY ("A") REFERENCES "FieldReading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FieldReadingToLote" ADD CONSTRAINT "_FieldReadingToLote_B_fkey" FOREIGN KEY ("B") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
