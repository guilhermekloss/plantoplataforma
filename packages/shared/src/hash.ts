import { createHash } from "node:crypto";

/**
 * Serializa um objeto de forma determinística (chaves ordenadas
 * recursivamente) para que o hash de assinatura não dependa da
 * ordem de inserção das propriedades.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Hash de assinatura do contrato: sha256(JSON canônico do payload). */
export function hashContract(payload: unknown): string {
  return sha256Hex(canonicalJSON(payload));
}
