'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  LayoutDashboard,
  Satellite,
  ShoppingCart,
  Sparkles,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlantorBrand } from '@/components/plantor-logo';
import { SignOutButton } from '@/components/sign-out-button';

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function AppHeader({
  name,
  orgType,
}: {
  name?: string | null;
  orgType?: string;
}): React.ReactElement {
  const pathname = usePathname();
  const isProducer = orgType === 'producer';
  const links: { href: string; label: string; icon: LucideIcon }[] = isProducer
    ? [
        { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
        { href: '/producao', label: 'Produção', icon: Sprout },
        { href: '/campo', label: 'Meu campo', icon: Satellite },
        { href: '/assistant', label: 'Assistente', icon: Sparkles },
      ]
    : [
        { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
        { href: '/contracts', label: 'Contratos', icon: FileText },
        { href: '/mercado', label: 'Mercado', icon: ShoppingCart },
      ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" aria-label="Ir para o painel">
            <PlantorBrand />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Principal">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <l.icon className="h-4 w-4" aria-hidden />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {name ? (
            <span className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                aria-hidden
              >
                {initials(name)}
              </span>
              <span className="hidden text-muted-foreground md:inline">{name}</span>
            </span>
          ) : null}
          <SignOutButton />
        </div>
      </div>

      {/* Navegação mobile: barra de abas abaixo do header */}
      <nav
        className="flex items-center justify-around border-t px-2 py-1.5 sm:hidden"
        aria-label="Principal (mobile)"
      >
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px]',
                active ? 'font-medium text-primary' : 'text-muted-foreground',
              )}
            >
              <l.icon className="h-5 w-5" aria-hidden />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
