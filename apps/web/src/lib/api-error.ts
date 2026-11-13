/** Parsing unificado do envelope de erro da API NestJS (message + errors[] do Zod). */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiErrorBody {
  message?: string;
  errors?: { path: string; message: string }[];
}

/** Extrai uma mensagem legível do corpo de erro da API (fallback genérico se não der). */
export async function parseApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.map((e) => e.message).join(' ');
    }
    return body.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}
