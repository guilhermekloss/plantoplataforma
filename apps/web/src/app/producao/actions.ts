'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiRequestError } from '@/lib/server-api';

export interface OfferActionResult {
  ok: boolean;
  error?: string;
}

export async function createOffer(input: {
  fieldReadingId: string;
  quantitySacks?: number;
  askingPriceCents?: number;
  notes?: string;
}): Promise<OfferActionResult> {
  try {
    await apiFetch('/offers', { method: 'POST', body: JSON.stringify(input) });
    revalidatePath('/producao');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiRequestError ? err.message : 'Erro ao disponibilizar o lote.' };
  }
}
