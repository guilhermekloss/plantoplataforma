import type { PrismaService } from '../prisma/prisma.service';

/**
 * Ids dos lotes (FieldReading) do produtor que já têm oferta aberta no mercado.
 * Regra única para "oferta aberta" (disponível ou em negociação) — usada tanto
 * pelo panorama de campo quanto pelo agente de sugestão de contratos.
 */
export async function openOfferReadingIds(
  prisma: PrismaService,
  sellerId: string,
): Promise<Set<string>> {
  const offers = await prisma.offer.findMany({
    where: { sellerId, status: { in: ['disponivel', 'em_negociacao'] } },
    select: { fieldReadingId: true },
  });
  return new Set(offers.map((o) => o.fieldReadingId));
}
