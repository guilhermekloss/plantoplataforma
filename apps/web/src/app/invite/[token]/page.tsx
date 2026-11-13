'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptInvite } from '@/lib/api';

interface InvitePayload {
  email?: string;
  inviterName?: string;
  exp?: number;
}

/** Decodifica o payload do JWT apenas para EXIBIÇÃO (não confia nele). */
function decodeInvite(token: string): InvitePayload {
  try {
    const part = token.split('.')[1];
    if (!part) return {};
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as InvitePayload;
  } catch {
    return {};
  }
}

export default function InvitePage({
  params,
}: {
  params: { token: string };
}): React.ReactElement {
  const router = useRouter();
  const info = useMemo(() => decodeInvite(params.token), [params.token]);
  // Checagem de exibição: evita o produtor preencher tudo para só então descobrir
  // que o link venceu (a API revalida de verdade no submit).
  const expired = info.exp != null && info.exp * 1000 < Date.now();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError('É necessário aceitar os termos.');
      return;
    }
    setLoading(true);
    try {
      await acceptInvite({ token: params.token, name, password });
      if (info.email) {
        const res = await signIn('credentials', {
          email: info.email,
          password,
          redirect: false,
        });
        if (!res?.error) {
          router.push('/dashboard');
          router.refresh();
          return;
        }
      }
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar convite.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Aceitar convite"
      subtitle={
        info.inviterName
          ? `Você foi convidado por ${info.inviterName}. Crie sua senha para acessar.`
          : 'Crie sua senha para acessar a Plantor.'
      }
    >
      {expired ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Este convite expirou</p>
          <p className="mt-1">
            Por segurança, os convites valem por 24 horas. Peça
            {info.inviterName ? ` para ${info.inviterName}` : ' à cooperativa'} enviar um novo — é
            rápido.
          </p>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="space-y-4">
        {info.email ? (
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={info.email} disabled readOnly />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>Li e aceito os termos de uso e a política de privacidade (LGPD).</span>
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Processando...' : 'Aceitar e acessar'}
        </Button>
      </form>
      )}
    </AuthCard>
  );
}
