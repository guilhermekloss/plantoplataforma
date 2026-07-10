"use server";

import { apiJson } from "@/lib/api-client";
import type { FieldDataOverview } from "@/lib/types";

export async function getFieldDataOverviewAction(): Promise<FieldDataOverview> {
  return apiJson<FieldDataOverview>("/field-data/overview");
}
