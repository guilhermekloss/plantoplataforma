-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "agronomicData" JSONB;

-- CreateTable
CREATE TABLE "FieldReading" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "grainType" "GrainType" NOT NULL,
    "harvestYear" TEXT NOT NULL,
    "harvestPeriod" "HarvestPeriod" NOT NULL,
    "areaHa" DECIMAL(65,30) NOT NULL,
    "yieldSacksPerHa" DECIMAL(65,30) NOT NULL,
    "harvestMoisturePct" DECIMAL(65,30),
    "harvestLossSacksPerHa" DECIMAL(65,30),
    "plantingDate" TIMESTAMP(3),
    "plantPopulationPerHa" INTEGER,
    "soilMoisturePct" DECIMAL(65,30),
    "soilPh" DECIMAL(65,30),
    "ndviAvg" DECIMAL(65,30),
    "rainfallMmCycle" DECIMAL(65,30),
    "gddCycle" DECIMAL(65,30),
    "avgTempC" DECIMAL(65,30),
    "frostEvents" INTEGER,
    "machineData" JSONB,
    "yieldMap" JSONB,
    "climateData" JSONB,
    "source" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldReading_organizationId_grainType_harvestYear_idx" ON "FieldReading"("organizationId", "grainType", "harvestYear");

-- AddForeignKey
ALTER TABLE "FieldReading" ADD CONSTRAINT "FieldReading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
