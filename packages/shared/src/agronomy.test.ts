import { describe, expect, it } from "vitest";
import { alqueiresToHectares, estimateGrossValueCents, hectaresToAlqueires, INDICATIVE_PRICE_CENTS } from "./agronomy";

describe("agronomy", () => {
  it("converte alqueires pra hectares (fazenda de exemplo: 10 alqueires = 24,2 ha)", () => {
    expect(alqueiresToHectares(10)).toBeCloseTo(24.2, 5);
  });

  it("hectaresToAlqueires é o inverso de alqueiresToHectares", () => {
    expect(hectaresToAlqueires(alqueiresToHectares(10))).toBeCloseTo(10, 5);
  });

  it("estima receita bruta = produtividade x área x preço indicativo/sc", () => {
    const value = estimateGrossValueCents("SOJA", 60, 24.2);
    expect(value).toBe(Math.round(60 * 24.2 * INDICATIVE_PRICE_CENTS.SOJA));
  });

  it("preços indicativos existem para as três culturas suportadas", () => {
    expect(INDICATIVE_PRICE_CENTS.SOJA).toBeGreaterThan(0);
    expect(INDICATIVE_PRICE_CENTS.MILHO).toBeGreaterThan(0);
    expect(INDICATIVE_PRICE_CENTS.TRIGO).toBeGreaterThan(0);
  });

  it("área ou produtividade zero resulta em receita zero", () => {
    expect(estimateGrossValueCents("MILHO", 0, 24.2)).toBe(0);
    expect(estimateGrossValueCents("MILHO", 60, 0)).toBe(0);
  });
});
