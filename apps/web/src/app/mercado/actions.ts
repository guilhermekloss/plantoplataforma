'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiRequestError } from '@/lib/server-api';
import type { OfferEvaluation, OfferTraceability } from '@/lib/offers';

export async function acceptOffer(
  offerId: string,
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  try {
    const data = await apiFetch<{ contractId: string }>(`/offers/${offerId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    revalidatePath('/mercado');
    revalidatePath('/contracts');
    return { ok: true, contractId: data.contractId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiRequestError ? err.message : 'Erro ao gerar contrato.',
    };
  }
}

/** Dossiê de rastreabilidade do lote (plantio → armazenagem), carregado sob demanda. */
export async function fetchTraceability(
  offerId: string,
): Promise<{ ok: boolean; data?: OfferTraceability; error?: string }> {
  try {
    const data = await apiFetch<OfferTraceability>(`/offers/${offerId}/traceability`);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiRequestError ? err.message : 'Erro ao carregar a rastreabilidade.',
    };
  }
}

/** IA avalia se a qualidade do lote justifica o preço pedido. */
export async function evaluateOffer(
  offerId: string,
): Promise<{ ok: boolean; data?: OfferEvaluation; error?: string }> {
  try {
    const data = await apiFetch<OfferEvaluation>(`/ai/offers/${offerId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiRequestError ? err.message : 'Erro ao avaliar a oferta.',
    };
  }
}
