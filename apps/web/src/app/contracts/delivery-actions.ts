'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiRequestError } from '@/lib/server-api';
import type { ActionResult } from './actions';

function fail(err: unknown): ActionResult<never> {
  if (err instanceof ApiRequestError) return { ok: false, error: err.message };
  return { ok: false, error: 'Erro inesperado. Tente novamente.' };
}

export async function registerDelivery(
  contractId: string,
  input: { deliveryDate: string; quantitySacks: number; nfeKey?: string; warehouseReceiptNumber?: string },
): Promise<ActionResult> {
  try {
    await apiFetch('/deliveries', {
      method: 'POST',
      body: JSON.stringify({ contractId, ...input }),
    });
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addQualityReport(
  contractId: string,
  deliveryId: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await apiFetch(`/deliveries/${deliveryId}/quality-report`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function releasePayment(contractId: string, deliveryId: string): Promise<ActionResult> {
  try {
    await apiFetch(`/deliveries/${deliveryId}/release-payment`, { method: 'POST' });
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
