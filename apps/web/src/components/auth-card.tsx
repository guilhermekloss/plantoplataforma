import Link from 'next/link';
import { FileCheck2, Satellite, ShieldCheck } from 'lucide-react';
import { PlantorBrand, PlantorLogo } from '@/components/plantor-logo';

const VALUE_PROPS = [
  {
    icon: Satellite,
    title: 'Dados direto do campo',
    text: 'Produtividade, clima e qualidade chegam prontos das máquinas e sensores.',
  },
  {
    icon: FileCheck2,
    title: 'Contrato em um clique',
    text: 'Da oferta ao contrato assinado, sem papel e sem retrabalho.',
  },
  {
    icon: ShieldCheck,
    title: 'Registro imutável',
    text: 'Cada assinatura e entrega com trilha auditável em blockchain.',
  },
];

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.ReactElement {
  return (
    <main className="flex min-h-screen bg-muted/30">
      {/* Painel de marca — visível em telas médias para cima */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-orange-700 p-10 text-primary-foreground lg:flex">
        <PlantorLogo
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 text-primary-foreground/10"
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2">
            <PlantorLogo className="h-8 w-8 text-primary-foreground" />
            <span className="text-2xl font-semibold tracking-tight">Plantor</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            A safra vira contrato.
            <br />
            O contrato vira dinheiro.
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Plataforma de contratos de grãos que conecta produtores e compradores com dados
            agronômicos reais.
          </p>
          <ul className="mt-8 space-y-5">
            {VALUE_PROPS.map((v) => (
              <li key={v.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15" aria-hidden>
                  <v.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{v.title}</p>
                  <p className="text-sm text-primary-foreground/75">{v.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          Feito para o agronegócio brasileiro 🇧🇷
        </p>
      </aside>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up rounded-2xl border bg-card p-8 shadow-sm">
          <Link href="/" className="mb-6 flex justify-center lg:hidden">
            <PlantorBrand markClassName="h-8 w-8" className="[&>span:last-child]:text-2xl" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
