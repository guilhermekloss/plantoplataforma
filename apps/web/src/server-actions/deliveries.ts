"use server";

import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/api-client";
import type { DeliveryItem, QualityReportItem } from "@/lib/types";

export async function registerDeliveryAction(input: { contractId: string; quantityKg: number; deliveredAt: string }) {
  const delivery = await apiJson<DeliveryItem>("/deliveries", { method: "POST", body: JSON.stringify(input) });
  revalidatePath(`/contracts/${input.contractId}`);
  return delivery;
}

export async function addQualityReportAction(
  contractId: string,
  deliveryId: string,
  input: { moisturePct: number; impuritiesPct: number; brokenGrainsPct: number },
) {
  const report = await apiJson<QualityReportItem>(`/deliveries/${deliveryId}/quality-report`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath(`/contracts/${contractId}`);
  return report;
}

export async function releasePaymentAction(contractId: string, deliveryId: string) {
  const delivery = await apiJson<DeliveryItem>(`/deliveries/${deliveryId}/release-payment`, { method: "POST" });
  revalidatePath(`/contracts/${contractId}`);
  return delivery;
}
