'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiRequestError } from '@/lib/server-api';
import type { Contract } from '@/lib/contracts';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(err: unknown): ActionResult<never> {
  if (err instanceof ApiRequestError) return { ok: false, error: err.message };
  return { ok: false, error: 'Erro inesperado. Tente novamente.' };
}

export interface ProducerSummary {
  id: string;
  name: string;
  cpf: string | null;
  city: string | null;
}

export async function searchProducers(q: string): Promise<ProducerSummary[]> {
  try {
    return await apiFetch<ProducerSummary[]>(`/organizations/producers?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
}

export async function inviteProducer(
  email: string,
  producerName?: string,
): Promise<ActionResult> {
  try {
    await apiFetch('/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ email, producerName }),
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createContract(
  input: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const contract = await apiFetch<Contract>('/contracts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/contracts');
    return { ok: true, data: { id: contract.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function submitContract(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/contracts/${id}/submit`, { method: 'POST' });
    revalidatePath(`/contracts/${id}`);
    revalidatePath('/contracts');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function signContract(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/contracts/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ accept: true }),
    });
    revalidatePath(`/contracts/${id}`);
    revalidatePath('/contracts');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function disputeContract(id: string, reason: string): Promise<ActionResult> {
  try {
    await apiFetch(`/contracts/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    revalidatePath(`/contracts/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelContract(id: string, reason: string): Promise<ActionResult> {
  try {
    await apiFetch(`/contracts/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    revalidatePath(`/contracts/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
