-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('cooperative', 'trading', 'producer');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'operator', 'producer', 'viewer');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('rascunho', 'pendente_assinatura_comprador', 'pendente_assinatura_produtor', 'assinado', 'em_execucao', 'entregue_parcial', 'disputado', 'liquidado', 'cancelado');

-- CreateEnum
CREATE TYPE "CprType" AS ENUM ('fisica', 'financeira');

-- CreateEnum
CREATE TYPE "GrainType" AS ENUM ('soja', 'milho', 'cafe', 'trigo', 'algodao', 'sorgo', 'feijao');

-- CreateEnum
CREATE TYPE "HarvestPeriod" AS ENUM ('primeira', 'segunda', 'unica');

-- CreateEnum
CREATE TYPE "GrainGrade" AS ENUM ('T1', 'T2', 'T3', 'fora_padrao');

-- CreateEnum
CREATE TYPE "QualityAdjType" AS ENUM ('proportional', 'fixed_pct', 'rejection', 'none');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('fixo', 'media_mercado', 'indexado_b3', 'indexado_cbot');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD');

-- CreateEnum
CREATE TYPE "PriceAdjIndex" AS ENUM ('IPCA', 'IGPM', 'none');

-- CreateEnum
CREATE TYPE "TransportResp" AS ENUM ('seller', 'buyer');

-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('seller', 'buyer', 'witness');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('criado', 'assinado_comprador', 'assinado_produtor', 'em_execucao', 'entregue', 'entregue_parcial', 'laudo_anexado', 'pagamento_liberado', 'pagamento_pago', 'disputado', 'cancelado', 'hash_registrado_onchain');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendente', 'liberado', 'pago');

-- CreateEnum
CREATE TYPE "BlockchainRecordType" AS ENUM ('contract_registered', 'status_changed', 'delivery_confirmed', 'payment_released', 'dispute_raised');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('trial', 'starter', 'pro', 'enterprise');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "stateRegistration" TEXT,
    "carNumber" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "address" JSONB,
    "bankAccount" JSONB,
    "plan" "PlanType" NOT NULL DEFAULT 'trial',
    "planExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "cprNumber" TEXT,
    "cprType" "CprType",
    "status" "ContractStatus" NOT NULL DEFAULT 'rascunho',
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "grainType" "GrainType" NOT NULL,
    "quantitySacks" DECIMAL(65,30) NOT NULL,
    "sackWeightKg" DECIMAL(65,30) NOT NULL DEFAULT 60,
    "harvestYear" TEXT NOT NULL,
    "harvestPeriod" "HarvestPeriod" NOT NULL,
    "grainGrade" "GrainGrade",
    "maxMoisturePct" DECIMAL(65,30) NOT NULL DEFAULT 14.0,
    "maxImpurityPct" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "minSpecificWeightGL" DECIMAL(65,30),
    "maxDamagedPct" DECIMAL(65,30),
    "qualityAdjType" "QualityAdjType" NOT NULL,
    "priceType" "PriceType" NOT NULL,
    "priceValueCents" BIGINT,
    "priceCurrency" "Currency" NOT NULL DEFAULT 'BRL',
    "priceAdjIndex" "PriceAdjIndex",
    "advancePct" DECIMAL(65,30),
    "barterDescription" TEXT,
    "warehouseName" TEXT NOT NULL,
    "warehouseAddress" JSONB NOT NULL,
    "deliveryDeadline" TIMESTAMP(3) NOT NULL,
    "transportResponsible" "TransportResp" NOT NULL,
    "penaltyPct" DECIMAL(65,30) NOT NULL DEFAULT 10.0,
    "hasWashoutClause" BOOLEAN NOT NULL DEFAULT true,
    "hasForceMajeure" BOOLEAN NOT NULL DEFAULT true,
    "arbitrationForum" TEXT,
    "contractHash" TEXT,
    "blockchainTxHash" TEXT,
    "blockchainNetwork" TEXT,
    "blockchainContractAddr" TEXT,
    "signedAt" TIMESTAMP(3),
    "executionStartedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signerRole" "SignerRole" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "documentHashBefore" TEXT NOT NULL,
    "documentHashAfter" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedById" TEXT,
    "blockchainTxHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "quantitySacks" DECIMAL(65,30) NOT NULL,
    "nfeKey" TEXT,
    "warehouseReceiptNumber" TEXT,
    "moisturePct" DECIMAL(65,30),
    "impurityPct" DECIMAL(65,30),
    "specificWeightGL" DECIMAL(65,30),
    "damagedPct" DECIMAL(65,30),
    "qualityAccepted" BOOLEAN,
    "priceAdjustmentPct" DECIMAL(65,30),
    "paymentAmountCents" BIGINT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pendente',
    "paymentReleasedAt" TIMESTAMP(3),
    "pixTxId" TEXT,
    "blockchainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "laboratoryName" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "moisturePct" DECIMAL(65,30) NOT NULL,
    "impurityPct" DECIMAL(65,30) NOT NULL,
    "specificWeightGL" DECIMAL(65,30),
    "damagedPct" DECIMAL(65,30),
    "greenPct" DECIMAL(65,30),
    "brokenPct" DECIMAL(65,30),
    "ardidosPct" DECIMAL(65,30),
    "grade" "GrainGrade" NOT NULL,
    "fileUrl" TEXT,
    "fileHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainRecord" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "recordType" "BlockchainRecordType" NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "network" TEXT NOT NULL,
    "gasUsed" BIGINT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockchainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_tenantId_key" ON "Organization"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cnpj_key" ON "Organization"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cpf_key" ON "Organization"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_email_key" ON "Organization"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_idx" ON "Contract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Contract_sellerId_idx" ON "Contract"("sellerId");

-- CreateIndex
CREATE INDEX "Contract_buyerId_idx" ON "Contract"("buyerId");

-- CreateIndex
CREATE INDEX "Contract_deliveryDeadline_idx" ON "Contract"("deliveryDeadline");

-- CreateIndex
CREATE INDEX "ContractEvent_contractId_createdAt_idx" ON "ContractEvent"("contractId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReport_deliveryId_key" ON "QualityReport"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainRecord_txHash_key" ON "BlockchainRecord"("txHash");

-- CreateIndex
CREATE INDEX "BlockchainRecord_contractId_idx" ON "BlockchainRecord"("contractId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainRecord" ADD CONSTRAINT "BlockchainRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
