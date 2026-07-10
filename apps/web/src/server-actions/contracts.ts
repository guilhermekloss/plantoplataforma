"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Crop, OrgType } from "@plantor/shared";
import { apiJson } from "@/lib/api-client";
import type { ContractDetail, ContractListItem, OrganizationSummary } from "@/lib/types";

export async function searchOrganizationsAction(type: OrgType, q: string): Promise<OrganizationSummary[]> {
  const params = new URLSearchParams({ type, ...(q ? { q } : {}) });
  return apiJson<OrganizationSummary[]>(`/organizations?${params.toString()}`);
}

export interface CreateContractInput {
  sellerOrgId: string;
  crop: Crop;
  quantityKg: number;
  pricePerSc60Cents: number;
  deliveryDeadline: string;
}

export async function createContractAction(input: CreateContractInput) {
  const contract = await apiJson<ContractDetail>("/contracts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath("/contracts");
  redirect(`/contracts/${contract.id}`);
}

export async function listContractsAction(status?: string): Promise<ContractListItem[]> {
  const query = status ? `?status=${status}` : "";
  return apiJson<ContractListItem[]>(`/contracts${query}`);
}

export async function getContractAction(id: string): Promise<ContractDetail> {
  return apiJson<ContractDetail>(`/contracts/${id}`);
}

export async function signContractAction(contractId: string) {
  await apiJson(`/contracts/${contractId}/sign`, { method: "POST" });
  revalidatePath(`/contracts/${contractId}`);
}
