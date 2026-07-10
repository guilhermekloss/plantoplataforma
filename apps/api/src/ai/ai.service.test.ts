import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import type { GeminiService } from "./gemini.service";
import { AiService } from "./ai.service";

const baseContract = {
  id: "contract_1",
  number: "PLT-2026-0001",
  buyerOrgId: "org_buyer",
  sellerOrgId: "org_seller",
  crop: "SOJA",
  quantityKg: 60_000,
  pricePerSc60Cents: 13_000,
  totalValueCents: 13_000_000,
  deliveryDeadline: new Date("2026-12-01T00:00:00.000Z"),
  status: "ASSINADO",
  buyerOrg: { name: "Cotrijal" },
};

function fakePrisma(contract = baseContract, lotes: unknown[] = []): PrismaService {
  return {
    contract: {
      findUnique: vi.fn().mockResolvedValue(contract),
      findUniqueOrThrow: vi.fn().mockResolvedValue(contract),
      findMany: vi.fn().mockResolvedValue([contract]),
    },
    lote: {
      findMany: vi.fn().mockResolvedValue(lotes),
    },
  } as unknown as PrismaService;
}

describe("AiService.explainContract", () => {
  it("usa resumo determinístico quando o Gemini está indisponível (sem GEMINI_API_KEY)", async () => {
    const gemini = { isAvailable: false, complete: vi.fn() } as unknown as GeminiService;
    const service = new AiService(fakePrisma(), gemini);

    const result = await service.explainContract("contract_1", "org_buyer");

    expect(result.source).toBe("fallback");
    expect(result.explanation).toContain("PLT-2026-0001");
    expect(result.explanation).toContain("Cotrijal");
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it("usa a resposta do Gemini quando disponível", async () => {
    const gemini = {
      isAvailable: true,
      complete: vi.fn().mockResolvedValue("Explicação simples gerada pela IA."),
    } as unknown as GeminiService;
    const service = new AiService(fakePrisma(), gemini);

    const result = await service.explainContract("contract_1", "org_seller");

    expect(result.source).toBe("gemini");
    expect(result.explanation).toBe("Explicação simples gerada pela IA.");
  });

  it("cai no fallback se a chamada ao Gemini falhar (retorna null)", async () => {
    const gemini = { isAvailable: true, complete: vi.fn().mockResolvedValue(null) } as unknown as GeminiService;
    const service = new AiService(fakePrisma(), gemini);

    const result = await service.explainContract("contract_1", "org_buyer");

    expect(result.source).toBe("fallback");
  });
});

describe("AiService.chat", () => {
  it("retorna resposta desativada quando o Gemini está indisponível", async () => {
    const gemini = { isAvailable: false, complete: vi.fn() } as unknown as GeminiService;
    const service = new AiService(fakePrisma(), gemini);

    const result = await service.chat("org_seller", "quanto vou receber?");

    expect(result.disabled).toBe(true);
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it("ancora o prompt só nos contratos do próprio produtor (sellerOrgId)", async () => {
    const prisma = fakePrisma();
    const gemini = { isAvailable: true, complete: vi.fn().mockResolvedValue("resposta") } as unknown as GeminiService;
    const service = new AiService(prisma, gemini);

    const result = await service.chat("org_seller", "quais meus contratos?");

    expect(result.disabled).toBe(false);
    expect(result.reply).toBe("resposta");
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sellerOrgId: "org_seller" } }),
    );
    const prompt = (gemini.complete as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(prompt).toContain("PLT-2026-0001");
    expect(prompt).toContain("quais meus contratos?");
  });
});

const availableLote = {
  id: "lote_1",
  crop: "SOJA",
  quantityKg: 60_000,
  areaHectares: 24.2,
  status: "DISPONIVEL",
};

describe("AiService.suggestContracts", () => {
  it("sem lotes disponíveis, retorna fallback sem chamar o Gemini", async () => {
    const prisma = fakePrisma(baseContract, []);
    const gemini = { isAvailable: true, complete: vi.fn() } as unknown as GeminiService;
    const service = new AiService(prisma, gemini);

    const result = await service.suggestContracts("org_seller");

    expect(result.source).toBe("fallback");
    expect(result.eligibleLoteIds).toEqual([]);
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it("só considera lotes DISPONIVEL do próprio produtor na query", async () => {
    const prisma = fakePrisma(baseContract, [availableLote]);
    const gemini = { isAvailable: true, complete: vi.fn().mockResolvedValue("sugestão da IA") } as unknown as GeminiService;
    const service = new AiService(prisma, gemini);

    const result = await service.suggestContracts("org_seller");

    expect(prisma.lote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_seller", status: "DISPONIVEL" } }),
    );
    expect(result.source).toBe("gemini");
    expect(result.suggestion).toBe("sugestão da IA");
    expect(result.eligibleLoteIds).toEqual(["lote_1"]);

    const prompt = (gemini.complete as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(prompt).toContain("lote_1");
    expect(prompt).toContain("SOJA");
  });

  it("sem Gemini disponível, cai no fallback determinístico listando os lotes elegíveis", async () => {
    const prisma = fakePrisma(baseContract, [availableLote]);
    const gemini = { isAvailable: false, complete: vi.fn() } as unknown as GeminiService;
    const service = new AiService(prisma, gemini);

    const result = await service.suggestContracts("org_seller");

    expect(result.source).toBe("fallback");
    expect(result.suggestion).toContain("lote_1");
    expect(gemini.complete).not.toHaveBeenCalled();
  });
});
