import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { env } from '@/env';
import { ApiRequestError, parseApiError } from '@/lib/api-error';

export { ApiRequestError };

/**
 * Fetch autenticado server-side: injeta o Bearer token da sessão NextAuth.
 * O token da API nunca chega ao browser — só roda em Server Components/Actions.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 401) {
      redirect('/login');
    }
    throw new ApiRequestError(await parseApiError(res), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
