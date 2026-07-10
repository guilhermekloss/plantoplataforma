import { describe, expect, it } from "vitest";
import { LOTE_STATUSES, type LoteStatus } from "./enums";
import { assertTransitionLote, canTransitionLote, LOTE_TRANSITIONS } from "./lote-state-machine";

describe("lote-state-machine", () => {
  it("tabela de transições cobre todos os status", () => {
    for (const status of LOTE_STATUSES) {
      expect(LOTE_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("permite o fluxo feliz completo (com beneficiamento)", () => {
    expect(canTransitionLote("PLANTADO", "COLHIDO")).toBe(true);
    expect(canTransitionLote("COLHIDO", "BENEFICIAMENTO")).toBe(true);
    expect(canTransitionLote("BENEFICIAMENTO", "DISPONIVEL")).toBe(true);
    expect(canTransitionLote("DISPONIVEL", "OFERTADO")).toBe(true);
    expect(canTransitionLote("OFERTADO", "VENDIDO")).toBe(true);
  });

  it("permite pular beneficiamento (colhido -> disponível direto)", () => {
    expect(canTransitionLote("COLHIDO", "DISPONIVEL")).toBe(true);
  });

  it("oferta pode voltar a ficar disponível (oferta cancelada/expirada)", () => {
    expect(canTransitionLote("OFERTADO", "DISPONIVEL")).toBe(true);
  });

  it("VENDIDO é terminal", () => {
    expect(LOTE_TRANSITIONS.VENDIDO).toEqual([]);
  });

  it("rejeita pular etapas (plantado direto pra disponível)", () => {
    expect(canTransitionLote("PLANTADO", "DISPONIVEL")).toBe(false);
    expect(() => assertTransitionLote("PLANTADO", "DISPONIVEL" as LoteStatus)).toThrow();
  });
});
