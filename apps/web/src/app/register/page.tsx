'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Building2, Tractor, Warehouse, type LucideIcon } from 'lucide-react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAccount, type RegisterInput } from '@/lib/api';

// A única decisão do formulário: dizer em linguagem do usuário o que cada papel faz.
const ORG_TYPE_OPTIONS: {
  value: RegisterInput['type'];
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: 'producer', label: 'Produtor', description: 'Vendo a produção da minha fazenda', icon: Tractor },
  { value: 'cooperative', label: 'Cooperativa', description: 'Compro grãos dos meus cooperados', icon: Building2 },
  { value: 'trading', label: 'Trading', description: 'Origino grãos para exportação/indústria', icon: Warehouse },
];

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<RegisterInput['type']>('cooperative');
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
      await registerAccount({ name, email, password, type, acceptedTerms: true });
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        router.push('/login');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      subtitle="Cadastre sua organização na Plantor"
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">Quem é você no mercado?</legend>
          <div className="grid gap-2">
            {ORG_TYPE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  type === o.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/40 hover:bg-accent/50'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={o.value}
                  checked={type === o.value}
                  onChange={() => setType(o.value)}
                  className="sr-only"
                />
                <o.icon
                  className={`h-5 w-5 shrink-0 ${type === o.value ? 'text-primary' : 'text-muted-foreground'}`}
                  aria-hidden
                />
                <span>
                  <span className={`block font-medium ${type === o.value ? 'text-primary' : ''}`}>
                    {o.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{o.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="name">Nome da fazenda ou empresa</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            É assim que você vai aparecer nos contratos e no mercado.
          </p>
        </div>
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
          {loading ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}
