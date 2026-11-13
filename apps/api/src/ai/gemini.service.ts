import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Env } from '../config/env.schema';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Wrapper fino sobre o SDK oficial do Google Gemini (@google/genai).
 * Modelo padrão: gemini-2.5-flash (rápido e barato — bom para o produtor no celular).
 *
 * Sem GEMINI_API_KEY, fica desabilitado e o AiService usa fallback determinístico
 * — assim o produto funciona em dev/demo sem a chave.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.model = config.get('GEMINI_MODEL', { infer: true });
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async complete(system: string, messages: ChatMessage[], maxTokens = 1500): Promise<string> {
    if (!this.client) {
      throw new Error('IA não configurada (GEMINI_API_KEY ausente).');
    }
    const response = await this.client.models.generateContent({
      model: this.model,
      config: { systemInstruction: system, maxOutputTokens: maxTokens },
      // Gemini usa os papéis "user" e "model" (não "assistant").
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });
    return (response.text ?? '').trim();
  }
}
