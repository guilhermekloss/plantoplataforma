/** Cliente HTTP mínimo para endpoints públicos da API NestJS (server-side). */
import { env } from '@/env';
import { parseApiError } from '@/lib/api-error';

async function publicPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  type: 'cooperative' | 'trading' | 'producer';
  acceptedTerms: true;
}

export async function registerAccount(input: RegisterInput): Promise<void> {
  await publicPost('/auth/register', input);
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export async function acceptInvite({ token, ...body }: AcceptInviteInput): Promise<void> {
  await publicPost(`/auth/accept-invite/${token}`, { ...body, acceptedTerms: true });
}
