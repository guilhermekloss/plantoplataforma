import type { Contract, ContractSignature, Prisma } from '@prisma/client';

/** Converte Prisma.Decimal | null em string (ou null) para hashing determinístico. */
function dec(value: Prisma.Decimal | null): string | null {
  return value == null ? null : value.toString();
}

/**
 * Constrói o "documento" canônico do contrato — o conjunto de campos juridicamente
 * relevantes que são assinados (MP 2.200-2/2001). É deserializado de forma
 * determinística por `canonicalize` (do @plantor/shared) e seu SHA-256 vira o
 * documentHash. Campos voláteis (updatedAt, status de pagamento, etc.) ficam fora.
 *
 * `signatures` entra no documento para que o hash "após" cada assinatura mude,
 * encadeando as assinaturas de forma auditável.
 */
export function buildContractDocument(
  contract: Contract,
  signatures: Pick<ContractSignature, 'signerRole' | 'userId' | 'signedAt' | 'documentHashBefore'>[],
): Record<string, unknown> {
  return {
    contractNumber: contract.contractNumber,
    parties: {
      sellerId: contract.sellerId,
      buyerId: contract.buyerId,
    },
    object: {
      grainType: contract.grainType,
      quantitySacks: dec(contract.quantitySacks),
      sackWeightKg: dec(contract.sackWeightKg),
      harvestYear: contract.harvestYear,
      harvestPeriod: contract.harvestPeriod,
    },
    quality: {
      maxMoisturePct: dec(contract.maxMoisturePct),
      maxImpurityPct: dec(contract.maxImpurityPct),
      minSpecificWeightGL: dec(contract.minSpecificWeightGL),
      maxDamagedPct: dec(contract.maxDamagedPct),
      qualityAdjType: contract.qualityAdjType,
    },
    price: {
      priceType: contract.priceType,
      priceValueCents: contract.priceValueCents == null ? null : contract.priceValueCents.toString(),
      priceCurrency: contract.priceCurrency,
      advancePct: dec(contract.advancePct),
      barterDescription: contract.barterDescription,
    },
    delivery: {
      warehouseName: contract.warehouseName,
      warehouseAddress: contract.warehouseAddress,
      deliveryDeadline: contract.deliveryDeadline.toISOString(),
      transportResponsible: contract.transportResponsible,
    },
    penalties: {
      penaltyPct: dec(contract.penaltyPct),
      hasWashoutClause: contract.hasWashoutClause,
      hasForceMajeure: contract.hasForceMajeure,
      arbitrationForum: contract.arbitrationForum,
    },
    signatures: signatures
      .map((s) => ({
        signerRole: s.signerRole,
        userId: s.userId,
        signedAt: s.signedAt.toISOString(),
        documentHashBefore: s.documentHashBefore,
      }))
      .sort((a, b) => a.signedAt.localeCompare(b.signedAt)),
  };
}
