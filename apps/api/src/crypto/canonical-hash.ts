import { createHash } from 'node:crypto';
import { canonicalize } from '@plantor/shared';

/**
 * Hash SHA-256 (hex) do JSON canônico de um objeto — síncrono, server-side.
 *
 * É o "documento" assinado no MVP (MP 2.200-2/2001): o JSON canônico do contrato.
 * Usado em ContractSignature.documentHashBefore / documentHashAfter e em
 * Contract.contractHash.
 */
export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}
