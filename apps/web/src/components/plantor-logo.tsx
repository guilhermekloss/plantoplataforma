import { cn } from '@/lib/utils';

/**
 * Marca da Plantor — "P" hexagonal com simetria de rotação 180° e ponto central.
 * Usa currentColor, então herda a cor via classes de texto (ex.: text-primary).
 */
export function PlantorLogo({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 120 132"
      className={cn('h-7 w-7', className)}
      fill="currentColor"
      role="img"
      aria-label="Plantor"
    >
      <path d="M52 10 L78 24 L44 42 L44 92 L24 80 L24 30 Z" />
      <path d="M68 122 L42 108 L76 90 L76 40 L96 52 L96 102 Z" />
      <circle cx="60" cy="66" r="11" />
    </svg>
  );
}

/** Logo + wordmark "Plantor" em uma linha. */
export function PlantorBrand({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}): React.ReactElement {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <PlantorLogo className={cn('h-6 w-6 text-primary', markClassName)} />
      <span className="text-lg font-semibold tracking-tight text-foreground">Plantor</span>
    </span>
  );
}
