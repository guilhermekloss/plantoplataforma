'use server';

import type { GrainType } from '@plantor/shared';

/*
 * Estas actions NÃO chamam revalidatePath: com o loading.tsx raiz, o revalidate
 * dentro da action remonta a página e apaga o feedback ("Alvo salvo", resultado
 * da colheita). Quem chama faz router.refresh(), que re-renderiza com dados
 * novos, limpa o cache do router (Painel/Produção) e preserva o estado do cliente.
 */
import { apiFetch, ApiRequestError } from '@/lib/server-api';

export interface CampoActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.message : fallback;
}

/** Define (ou remove, com `null`) o preço-alvo por saca de uma cultura. */
export async function setTargetPrice(
  grainType: GrainType,
  targetPriceCents: number | null,
): Promise<CampoActionResult> {
  try {
    await apiFetch('/field-data/target-price', {
      method: 'PATCH',
      body: JSON.stringify({ grainType, targetPriceCents }),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Não foi possível salvar o preço-alvo.') };
  }
}

/**
 * Demo/dev: gera o evento de colheita da OEM (como se a colheitadeira tivesse
 * terminado o talhão) e o ingere — o lote aparece sozinho em Produção.
 */
export async function simulateHarvest(grainType: GrainType): Promise<CampoActionResult> {
  try {
    const res = await apiFetch<{ created: boolean }>(
      `/field-data/events/harvest/simulate?grain=${encodeURIComponent(grainType)}`,
      { method: 'POST' },
    );
    return {
      ok: true,
      message: res.created
        ? 'Colheita recebida da máquina — o lote novo já está em Produção.'
        : 'Esse evento de colheita já tinha sido recebido hoje (idempotente por evento).',
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Não foi possível simular a colheita.') };
  }
}
