/** Formatação de valores (dinheiro, sacas, datas) — ponto único do app web. */

export function formatMoney(cents: string | null, currency: 'BRL' | 'USD' = 'BRL'): string {
  if (cents == null) return '—';
  const value = Number(cents) / 100;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

export function formatSacks(sacks: string): string {
  return new Intl.NumberFormat('pt-BR').format(Number(sacks));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/**
 * Formatação compacta de dinheiro para KPIs — valores grandes viram
 * "R$ 408,4 mil" / "R$ 11,25 mi" para nunca estourar o card.
 * O valor completo deve ir no `title` do elemento para inspeção.
 */
export function formatMoneyCompact(cents: string | number | null): string {
  if (cents == null) return '—';
  const value = Number(cents) / 100;
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const nf = (v: number, digits: number): string =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(v);
  if (abs >= 1_000_000_000) return `R$ ${nf(value / 1_000_000_000, 1)} bi`;
  if (abs >= 1_000_000) return `R$ ${nf(value / 1_000_000, 1)} mi`;
  if (abs >= 100_000) return `R$ ${nf(value / 1_000, 0)} mil`;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: abs >= 10_000 ? 0 : 2,
  }).format(value);
}

/** Sacas compactas: 744.400 → "744,4 mil". */
export function formatSacksCompact(sacks: string | number): string {
  const value = Number(sacks);
  if (!Number.isFinite(value)) return '—';
  const nf = (v: number, digits: number): string =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(v);
  if (Math.abs(value) >= 1_000_000) return `${nf(value / 1_000_000, 2)} mi`;
  if (Math.abs(value) >= 100_000) return `${nf(value / 1_000, 1)} mil`;
  return nf(value, 0);
}
