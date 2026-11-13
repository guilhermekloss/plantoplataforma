import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Card de indicador: valor compacto que nunca estoura o card,
 * com o valor completo disponível no tooltip nativo (title).
 */
export function KpiCard({
  label,
  value,
  fullValue,
  icon: Icon,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: string;
  /** Valor por extenso, mostrado no hover quando `value` é compactado. */
  fullValue?: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'default' | 'primary' | 'positive';
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        tone === 'primary' && 'border-primary/25 bg-gradient-to-br from-accent/70 to-card',
        className,
      )}
      title={fullValue}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground/60',
              tone === 'primary' && 'text-primary/70',
              tone === 'positive' && 'text-emerald-600',
            )}
          />
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl',
          tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
