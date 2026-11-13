'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Building2, Loader2, Tractor, Warehouse } from 'lucide-react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEMO_ACCOUNTS = [
  { email: 'joao@fazenda.example', label: 'João · Produtor (24 ha)', icon: Tractor },
  { email: 'gerente@boavista.example', label: 'Ana · Fazenda mista (10 mil ha)', icon: Warehouse },
  { email: 'operador@cotrijal.example', label: 'Cooperativa compradora', icon: Building2 },
] as const;

function LoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function doSignIn(email: string, password: string): Promise<void> {
    setError(null);
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Email ou senha inválidos.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    await doSignIn(email, password);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="relative">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
        <span className="relative mx-auto block w-fit bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
          ou explore a demonstração
        </span>
      </div>

      <div className="grid gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={loading}
            onClick={() => void doSignIn(a.email, 'plantor123')}
            className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <a.icon className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage(): React.ReactElement {
  return (
    <AuthCard
      title="Entrar"
      subtitle="Acesse sua conta Plantor"
      footer={
        <>
          Não tem conta?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
