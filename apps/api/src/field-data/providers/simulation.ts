/**
 * Utilitários compartilhados pelos providers SIMULADOS de dados de campo.
 * A geração é determinística por dia — a demo fica estável dentro do mesmo dia.
 */

/** PRNG determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dayKey(d: Date): number {
  return Math.floor(d.getTime() / (24 * 3600 * 1000));
}

/** Seed estável a partir de um texto (id de lote, nº de contrato) + dia. */
export function seedFromText(text: string, now: Date): number {
  let h = dayKey(now);
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function formatBrDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
