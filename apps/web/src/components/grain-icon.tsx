import type { GrainType } from '@plantor/shared';
import { Bean, Coffee, Sprout, Wheat, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconProps = { className?: string };

/** Espiga de milho no estilo lucide (stroke 2, cantos arredondados). */
function CornIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10 4c-2.2 1.6-3.5 4.6-3.5 8 0 4.4 2.2 8 5.5 8s5.5-3.6 5.5-8c0-3.4-1.3-6.4-3.5-8-1.2-.9-2.8-.9-4 0Z" />
      <path d="M12 6v13" />
      <path d="M8.6 9.5c2.2 1 4.6 1 6.8 0" />
      <path d="M8 13.5c2.6 1 5.4 1 8 0" />
    </svg>
  );
}

/** Flor de algodão no estilo lucide. */
function CottonIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8.5 5.5a3.5 3.5 0 0 1 7 0 3.5 3.5 0 0 1 3 5.2 3.5 3.5 0 0 1-3.4 5.8 3.5 3.5 0 0 1-6.2 0 3.5 3.5 0 0 1-3.4-5.8 3.5 3.5 0 0 1 3-5.2Z" />
      <path d="M12 16.5V21" />
      <path d="M12 21c0-2 2.5-2.5 3.5-4" />
    </svg>
  );
}

const GRAIN_ICONS: Record<GrainType, LucideIcon | ((p: IconProps) => React.ReactElement)> = {
  soja: Sprout,
  milho: CornIcon,
  cafe: Coffee,
  trigo: Wheat,
  algodao: CottonIcon,
  sorgo: Wheat,
  feijao: Bean,
};

/** Paleta por grão — fundo suave + traço saturado, funciona em claro e escuro. */
const GRAIN_TONES: Record<GrainType, string> = {
  soja: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  milho: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  cafe: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400',
  trigo: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  algodao: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  sorgo: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  feijao: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
};

/** Ícone do grão puro (herda cor via currentColor). */
export function GrainIcon({
  grain,
  className,
}: {
  grain: GrainType;
  className?: string;
}): React.ReactElement {
  const Icon = GRAIN_ICONS[grain];
  return <Icon className={cn('h-5 w-5', className)} />;
}

/** Chip circular tintado com o ícone do grão — substitui os emojis. */
export function GrainChip({
  grain,
  size = 'md',
  className,
}: {
  grain: GrainType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}): React.ReactElement {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        box,
        GRAIN_TONES[grain],
        className,
      )}
      aria-hidden
    >
      <GrainIcon grain={grain} className={icon} />
    </span>
  );
}
