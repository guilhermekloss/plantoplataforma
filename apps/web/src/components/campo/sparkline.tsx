import { cn } from '@/lib/utils';

/**
 * Mini-gráfico de linha em SVG puro (sem recharts) para séries curtas de campo:
 * NDVI quinzenal, temperatura do silo. Escala própria por série, com piso/teto
 * opcionais para manter faixas comparáveis (ex.: NDVI sempre 0–1).
 */
export function Sparkline({
  values,
  min,
  max,
  className,
  strokeClassName = 'stroke-primary',
  fillClassName = 'fill-primary/10',
  label,
}: {
  values: number[];
  min?: number;
  max?: number;
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  /** Descrição acessível do gráfico. */
  label: string;
}): React.ReactElement | null {
  if (values.length < 2) return null;
  const W = 100;
  const H = 32;
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * (H - 2) - 1;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn('h-10 w-full overflow-visible', className)}
    >
      <path d={area} className={cn('stroke-none', fillClassName)} />
      <path
        d={line}
        className={cn('fill-none', strokeClassName)}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
