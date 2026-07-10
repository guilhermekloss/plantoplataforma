import { describe, expect, it } from "vitest";
import { CONTRACT_STATUSES, type ContractStatus } from "./enums";
import { assertTransition, canTransition, CONTRACT_TRANSITIONS } from "./contract-state-machine";

describe("contract-state-machine", () => {
  it("tabela de transições cobre todos os status", () => {
    for (const status of CONTRACT_STATUSES) {
      expect(CONTRACT_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("permite o fluxo feliz completo", () => {
    expect(canTransition("RASCUNHO", "PENDENTE_ASSINATURA")).toBe(true);
    expect(canTransition("PENDENTE_ASSINATURA", "ASSINADO")).toBe(true);
    expect(canTransition("ASSINADO", "ENTREGA_PARCIAL")).toBe(true);
    expect(canTransition("ENTREGA_PARCIAL", "LIQUIDADO")).toBe(true);
  });

  it("permite liquidar direto de ASSINADO (entrega única, sem parcial)", () => {
    expect(canTransition("ASSINADO", "LIQUIDADO")).toBe(true);
  });

  it("estados terminais não têm transições de saída", () => {
    expect(CONTRACT_TRANSITIONS.LIQUIDADO).toEqual([]);
    expect(CONTRACT_TRANSITIONS.CANCELADO).toEqual([]);
  });

  it("rejeita transições inválidas (ex.: pular direto pra LIQUIDADO sem assinar)", () => {
    expect(canTransition("RASCUNHO", "LIQUIDADO")).toBe(false);
    expect(() => assertTransition("RASCUNHO", "LIQUIDADO" as ContractStatus)).toThrow();
  });

  it("rejeita reabrir um contrato liquidado", () => {
    expect(canTransition("LIQUIDADO", "ASSINADO")).toBe(false);
  });
});
