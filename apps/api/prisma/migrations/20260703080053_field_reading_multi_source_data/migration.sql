-- AlterTable
ALTER TABLE "FieldReading" ADD COLUMN     "operations" JSONB,
ADD COLUMN     "productionCost" JSONB,
ADD COLUMN     "soilAnalysis" JSONB,
ADD COLUMN     "storage" JSONB;
