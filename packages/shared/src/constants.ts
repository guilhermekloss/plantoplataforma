/** Constantes de domínio. */

/** Peso padrão de uma saca em kg. */
export const SACK_WEIGHT_KG = 60;

/** Prefixo do número de contrato auto-gerado: PLT-{ANO}-{SEQUENCIAL 4 DÍGITOS}. */
export const CONTRACT_NUMBER_PREFIX = 'PLT';

/** Formata um número de contrato: (2025, 1) → "PLT-2025-0001". */
export function formatContractNumber(year: number, sequence: number): string {
  return `${CONTRACT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Converte sacas para toneladas, dado o peso da saca. */
export function sacksToTons(sacks: number, sackWeightKg: number = SACK_WEIGHT_KG): number {
  return (sacks * sackWeightKg) / 1000;
}

/** Valida o formato da chave de acesso da NFe: 44 dígitos numéricos. */
export function isValidNfeKey(value: string): boolean {
  return /^\d{44}$/.test(value);
}
