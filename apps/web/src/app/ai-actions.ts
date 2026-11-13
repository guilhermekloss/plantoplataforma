'use server';

import { apiFetch, ApiRequestError } from '@/lib/server-api';

export interface ExplainResult {
  ok: boolean;
  enabled?: boolean;
  explanation?: string;
  error?: string;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResult {
  ok: boolean;
  enabled?: boolean;
  reply?: string;
  error?: string;
}

export async function explainContract(id: string): Promise<ExplainResult> {
  try {
    const data = await apiFetch<{ enabled: boolean; explanation: string }>(
      `/ai/contracts/${id}/explain`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return { ok: true, enabled: data.enabled, explanation: data.explanation };
  } catch (err) {
    return { ok: false, error: err instanceof ApiRequestError ? err.message : 'Erro ao gerar explicação.' };
  }
}

export async function askAssistant(
  message: string,
  history: AssistantTurn[],
): Promise<AssistantResult> {
  try {
    const data = await apiFetch<{ enabled: boolean; reply: string }>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
    return { ok: true, enabled: data.enabled, reply: data.reply };
  } catch (err) {
    return { ok: false, error: err instanceof ApiRequestError ? err.message : 'Erro ao falar com a assistente.' };
  }
}
