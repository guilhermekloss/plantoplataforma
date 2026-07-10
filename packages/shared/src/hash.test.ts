import { describe, expect, it } from "vitest";
import { canonicalJSON, hashContract } from "./hash";

describe("canonicalJSON / hashContract", () => {
  it("produz o mesmo hash independente da ordem das chaves", () => {
    const a = { number: "PLT-2026-0001", buyerOrgId: "org_1", quantityKg: 1000 };
    const b = { quantityKg: 1000, number: "PLT-2026-0001", buyerOrgId: "org_1" };

    expect(hashContract(a)).toBe(hashContract(b));
  });

  it("produz hashes diferentes para payloads com valores diferentes", () => {
    const a = { number: "PLT-2026-0001", quantityKg: 1000 };
    const b = { number: "PLT-2026-0001", quantityKg: 2000 };

    expect(hashContract(a)).not.toBe(hashContract(b));
  });

  it("é determinístico também com chaves aninhadas fora de ordem", () => {
    const a = { outer: { z: 1, a: 2 }, top: "x" };
    const b = { top: "x", outer: { a: 2, z: 1 } };

    expect(canonicalJSON(a)).toBe(canonicalJSON(b));
  });

  it("normaliza Date para ISO string de forma determinística", () => {
    const date = new Date("2026-07-10T12:00:00.000Z");
    expect(canonicalJSON({ deliveryDeadline: date })).toContain("2026-07-10T12:00:00.000Z");
  });
});
