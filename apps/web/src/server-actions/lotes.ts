"use server";

import { revalidatePath } from "next/cache";
import type { Crop, LoteStatus } from "@plantor/shared";
import { apiJson } from "@/lib/api-client";
import type { LoteItem } from "@/lib/types";

export async function listLotesAction(): Promise<LoteItem[]> {
  return apiJson<LoteItem[]>("/lotes");
}

export async function createLoteAction(input: {
  crop: Crop;
  season: string;
  areaHectares: number;
  quantityKg: number;
}) {
  const lote = await apiJson<LoteItem>("/lotes", { method: "POST", body: JSON.stringify(input) });
  revalidatePath("/producao");
  return lote;
}

export async function updateLoteStatusAction(loteId: string, status: LoteStatus) {
  const lote = await apiJson<LoteItem>(`/lotes/${loteId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  revalidatePath("/producao");
  return lote;
}
