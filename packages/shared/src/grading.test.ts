import { describe, expect, it } from "vitest";
import { calculateDiscountPct, calculatePriceAdjustment, classifyGrade } from "./grading";

describe("grading", () => {
  it("classifica TIPO_1 dentro do baseline (sem excesso)", () => {
    expect(classifyGrade({ moisturePct: 13, impuritiesPct: 0.5, brokenGrainsPct: 5 })).toBe("TIPO_1");
  });

  it("classifica TIPO_2 com excesso moderado", () => {
    expect(classifyGrade({ moisturePct: 14.5, impuritiesPct: 2, brokenGrainsPct: 15 })).toBe("TIPO_2");
  });

  it("classifica TIPO_3 com excesso maior", () => {
    expect(classifyGrade({ moisturePct: 15, impuritiesPct: 3, brokenGrainsPct: 25 })).toBe("TIPO_3");
  });

  it("classifica FORA_DE_TIPO acima de todos os limites", () => {
    expect(classifyGrade({ moisturePct: 20, impuritiesPct: 5, brokenGrainsPct: 30 })).toBe("FORA_DE_TIPO");
  });

  it("sem excesso não gera desconto", () => {
    expect(calculateDiscountPct({ moisturePct: 13, impuritiesPct: 0.5, brokenGrainsPct: 5 })).toBe(0);
  });

  it("desconto cresce proporcionalmente ao excesso de umidade", () => {
    const discount = calculateDiscountPct({ moisturePct: 16, impuritiesPct: 1, brokenGrainsPct: 8 });
    expect(discount).toBeCloseTo(2 * 1.5, 5); // 2 pontos de excesso de umidade * peso 1.5
  });

  it("desconto é limitado a 30%", () => {
    const discount = calculateDiscountPct({ moisturePct: 40, impuritiesPct: 40, brokenGrainsPct: 40 });
    expect(discount).toBe(30);
  });

  it("calculatePriceAdjustment aplica o desconto sobre o valor bruto corretamente", () => {
    const adjustment = calculatePriceAdjustment({ moisturePct: 13, impuritiesPct: 0.5, brokenGrainsPct: 5 }, 100_000);
    expect(adjustment.gradeClass).toBe("TIPO_1");
    expect(adjustment.discountPct).toBe(0);
    expect(adjustment.discountValueCents).toBe(0);
    expect(adjustment.finalValueCents).toBe(100_000);
  });

  it("calculatePriceAdjustment desconta valor proporcional quando há excesso", () => {
    const adjustment = calculatePriceAdjustment({ moisturePct: 16, impuritiesPct: 1, brokenGrainsPct: 8 }, 100_000);
    expect(adjustment.discountValueCents).toBe(Math.round((100_000 * adjustment.discountPct) / 100));
    expect(adjustment.finalValueCents).toBe(100_000 - adjustment.discountValueCents);
  });
});
