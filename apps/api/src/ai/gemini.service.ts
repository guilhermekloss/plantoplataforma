import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

/**
 * Provedor isolado atrás de complete() — AiService não sabe que é Gemini
 * (usuário escolheu Gemini, não Claude/OpenAI). Trocar de provedor no
 * futuro significa só trocar esta classe.
 *
 * @google/genai@0.15 é publicado com "type":"module" no package.json raiz,
 * mas dist/node/index.js (a entrada resolvida por `require`) ainda contém
 * `require()` internamente — um bug de empacotamento que quebra
 * `require("@google/genai")` a partir do nosso runtime CommonJS
 * (`ReferenceError: require is not defined in ES module scope`).
 * Contornado com `import()` dinâmico, que segue a condição "import" do
 * pacote e carrega dist/node/index.mjs (ESM de verdade) — só que o TS,
 * ao compilar para `module: commonjs`, reescreve `import()` estático em
 * `require()` (mesmo bug de novo). Por isso o import dinâmico é escondido
 * do compilador via `new Function(...)`, forçando um `import()` nativo em
 * runtime que o Node resolve corretamente pela condição "import".
 */
const importGoogleGenAI = new Function("return import('@google/genai')") as () => Promise<typeof import("@google/genai")>;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey?: string;
  private clientPromise: Promise<GoogleGenAI> | null = null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("GEMINI_API_KEY") || undefined;
  }

  get isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private getClient(): Promise<GoogleGenAI> | null {
    if (!this.apiKey) {
      return null;
    }
    if (!this.clientPromise) {
      this.clientPromise = importGoogleGenAI().then(
        ({ GoogleGenAI: GoogleGenAICtor }) => new GoogleGenAICtor({ apiKey: this.apiKey! }),
      );
    }
    return this.clientPromise;
  }

  async complete(prompt: string): Promise<string | null> {
    const clientPromise = this.getClient();
    if (!clientPromise) {
      return null;
    }
    try {
      const client = await clientPromise;
      const response = await client.models.generateContent({ model: MODEL, contents: prompt });
      return response.text ?? null;
    } catch (error) {
      this.logger.error("Falha ao chamar Gemini", error as Error);
      return null;
    }
  }
}
