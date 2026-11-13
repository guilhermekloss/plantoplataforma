/**
 * BigInt não é serializável por JSON.stringify (Express/Nest). Valores monetários
 * em centavos (priceValueCents, paymentAmountCents) usam BigInt no Prisma; aqui
 * ensinamos o JSON a emiti-los como string, preservando precisão no transporte.
 *
 * Importado como efeito colateral pelo AppModule (vale em runtime e nos testes).
 */
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (): string {
  return this.toString();
};

export {};
