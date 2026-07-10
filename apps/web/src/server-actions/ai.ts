"use server";

import { apiJson } from "@/lib/api-client";

export interface ExplainResult {
  explanation: string;
  source: "gemini" | "fallback";
}

export interface AssistantResult {
  reply: string;
  disabled: boolean;
}

export async function explainContractAction(contractId: string): Promise<ExplainResult> {
  return apiJson<ExplainResult>(`/ai/contracts/${contractId}/explain`, { method: "POST" });
}

export async function assistantAction(message: string): Promise<AssistantResult> {
  return apiJson<AssistantResult>("/ai/assistant", { method: "POST", body: JSON.stringify({ message }) });
}

export interface SuggestContractsResult {
  suggestion: string;
  source: "gemini" | "fallback";
  eligibleLoteIds: string[];
}

export async function suggestContractsAction(): Promise<SuggestContractsResult> {
  return apiJson<SuggestContractsResult>("/ai/suggest-contracts", { method: "POST" });
}
