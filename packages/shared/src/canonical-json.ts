/**
 * Serialização canônica de JSON para fins de assinatura digital (MP 2.200-2/2001).
 *
 * O "documento" assinado no MVP é o JSON canônico do contrato — serializado de
 * forma determinística com as chaves ordenadas recursivamente. O hash SHA-256
 * desse JSON garante imutabilidade jurídica sem depender de geração de PDF.
 *
 * Regras:
 * - Chaves de objetos ordenadas lexicograficamente (recursivo).
 * - Arrays preservam a ordem original.
 * - `undefined` e funções são omitidos (como em JSON.stringify).
 * - `Date` é serializado via toISOString (timestamp auditável).
 * - `bigint` é serializado como string (BigInt não é suportado por JSON.stringify).
 */
type CanonicalInput = unknown;

function normalize(value: CanonicalInput): unknown {
  if (value === null) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const normalized = normalize(obj[key]);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    return result;
  }
  return value;
}

/** Retorna a string JSON canônica (determinística) de um objeto. */
export function canonicalize(value: CanonicalInput): string {
  return JSON.stringify(normalize(value));
}

/**
 * Hash SHA-256 (hex) de uma string, isomórfico (Web Crypto).
 * Funciona em Node 18+ e no browser. Para uso síncrono no servidor, o apps/api
 * fornece um wrapper sobre node:crypto.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Conveniência: hash SHA-256 do JSON canônico de um objeto. */
export function canonicalHash(value: CanonicalInput): Promise<string> {
  return sha256Hex(canonicalize(value));
}
