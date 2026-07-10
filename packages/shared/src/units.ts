/** Saca padrão do agronegócio brasileiro = 60kg. Unidade de linguagem do produto. */
export const KG_PER_SACA = 60;

export function kgToSacas(kg: number): number {
  return kg / KG_PER_SACA;
}

export function sacasToKg(sacas: number): number {
  return sacas * KG_PER_SACA;
}

export function formatSacas(kg: number): string {
  return `${kgToSacas(kg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} sc`;
}
