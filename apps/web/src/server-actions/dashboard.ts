"use server";

import { apiJson } from "@/lib/api-client";
import type { DashboardSummary } from "@/lib/types";

export async function getDashboardSummaryAction(): Promise<DashboardSummary> {
  return apiJson<DashboardSummary>("/dashboard/summary");
}
