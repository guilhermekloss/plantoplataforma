import { auth } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Fetch autenticado contra a API — só pode ser chamado em Server Components/Actions. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new ApiError("Sem sessão autenticada", 401);
  }

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message ?? "Erro na requisição", res.status);
  }
  return res.json();
}
