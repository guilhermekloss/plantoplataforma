import type { LucideIcon } from 'lucide-react';

export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums" title={value}>
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Título de bloco dentro do card da lavoura, com ícone consistente. */
export function BlockTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }): React.ReactElement {
  return (
    <h3 className="mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </h3>
  );
}

/** Título de seção da página, com ícone consistente. */
export function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }): React.ReactElement {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-semibold">
      <Icon className="h-4 w-4 text-primary" aria-hidden />
      {children}
    </h2>
  );
}
