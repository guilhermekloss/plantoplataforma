"use server";

import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/api-client";
import type { ContractDetail, OfferItem } from "@/lib/types";

export async function createOfferAction(loteId: string, expectedPriceCents?: number) {
  const offer = await apiJson<OfferItem>("/offers", {
    method: "POST",
    body: JSON.stringify({ loteId, expectedPriceCents }),
  });
  revalidatePath("/producao");
  return offer;
}

export async function listMyOffersAction(): Promise<OfferItem[]> {
  return apiJson<OfferItem[]>("/offers/mine");
}

export async function listMarketAction(): Promise<OfferItem[]> {
  return apiJson<OfferItem[]>("/offers/market");
}

export async function generateContractAction(
  offerId: string,
  input: { pricePerSc60Cents: number; deliveryDeadline: string },
) {
  const contract = await apiJson<ContractDetail>(`/offers/${offerId}/generate-contract`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath("/mercado");
  return contract;
}
