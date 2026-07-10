import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertContractAccess } from "../common/contract-access";
import { GeminiService } from "./gemini.service";
import { kgToSacas, INDICATIVE_PRICE_CENTS, type Crop } from "@plantor/shared";

export interface ExplainResult {
  explanation: string;
  source: "gemini" | "fallback";
}

export interface AssistantResult {
  reply: string;
  disabled: boolean;
}

export interface SuggestContractsResult {
  suggestion: string;
  source: "gemini" | "fallback";
  eligibleLoteIds: string[];
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async explainContract(contractId: string, tenantId: string): Promise<ExplainResult> {
    const contract = await assertContractAccess(this.prisma, contractId, tenantId);
    const full = await this.prisma.contract.findUniqueOrThrow({
      where: { id: contract.id },
      include: { buyerOrg: true, sellerOrg: true },
    });

    const facts = this.contractFacts(full);

    if (this.gemini.isAvailable) {
      const prompt = [
        "Você explica contratos agrícolas em linguagem simples para um produtor rural que pode não ter formação jurídica.",
        "Seja direto, use no máximo 5 frases curtas, em português do Brasil. Não invente informações fora dos dados abaixo.",
        "",
        facts,
      ].join("\n");

      const text = await this.gemini.complete(prompt);
      if (text) {
        return { explanation: text, source: "gemini" };
      }
    }

    return { explanation: this.deterministicSummary(full), source: "fallback" };
  }

  async chat(tenantId: string, message: string): Promise<AssistantResult> {
    if (!this.gemini.isAvailable) {
      return {
        reply: "O assistente de IA está desativado no momento (nenhuma chave de IA configurada).",
        disabled: true,
      };
    }

    const contracts = await this.prisma.contract.findMany({
      where: { sellerOrgId: tenantId },
      include: { buyerOrg: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const contextLines = contracts.map((c) => this.contractFacts(c)).join("\n---\n");

    const prompt = [
      "Você é o assistente da Plantor para um produtor rural. Responda em português do Brasil, de forma direta e simples.",
      "Use APENAS os contratos listados abaixo como fonte de verdade — não invente contratos ou valores que não estejam aqui.",
      "Se a pergunta não puder ser respondida com esses dados, diga isso claramente.",
      "",
      "Contratos do produtor:",
      contextLines || "(nenhum contrato ainda)",
      "",
      `Pergunta do produtor: ${message}`,
    ].join("\n");

    const text = await this.gemini.complete(prompt);
    return { reply: text ?? "Não consegui gerar uma resposta agora. Tente novamente em instantes.", disabled: false };
  }

  /**
   * Sugestão de quais lotes ofertar agora — só considera Lote.status ===
   * "DISPONIVEL" do próprio produtor (tenantId). Usado pela tela /producao.
   */
  async suggestContracts(tenantId: string): Promise<SuggestContractsResult> {
    const lotes = await this.prisma.lote.findMany({
      where: { organizationId: tenantId, status: "DISPONIVEL" },
      orderBy: { createdAt: "desc" },
    });
    const eligibleLoteIds = lotes.map((l) => l.id);

    if (lotes.length === 0) {
      return { suggestion: "Nenhum lote disponível para ofertar no momento.", source: "fallback", eligibleLoteIds };
    }

    const loteLines = lotes
      .map(
        (l) =>
          `Lote ${l.id}: ${l.crop}, ${kgToSacas(l.quantityKg).toLocaleString("pt-BR")} sc, ${l.areaHectares} ha, preço de referência indicativo R$ ${(
            INDICATIVE_PRICE_CENTS[l.crop as Crop] / 100
          ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/sc.`,
      )
      .join("\n");

    if (this.gemini.isAvailable) {
      const prompt = [
        "Você ajuda um produtor rural a decidir quais lotes disponíveis vale a pena ofertar no mercado agora e a que preço.",
        "Use APENAS os lotes listados abaixo — não invente lotes. Preços são indicativos, não cotação real de mercado.",
        "Seja direto, no máximo 5 frases curtas, em português do Brasil.",
        "",
        "Lotes disponíveis:",
        loteLines,
      ].join("\n");

      const text = await this.gemini.complete(prompt);
      if (text) {
        return { suggestion: text, source: "gemini", eligibleLoteIds };
      }
    }

    return {
      suggestion: `Você tem ${lotes.length} lote(s) disponível(is) para ofertar:\n${loteLines}`,
      source: "fallback",
      eligibleLoteIds,
    };
  }

  private contractFacts(contract: {
    number: string;
    crop: string;
    quantityKg: number;
    pricePerSc60Cents: number;
    totalValueCents: number;
    deliveryDeadline: Date;
    status: string;
    buyerOrg: { name: string };
  }): string {
    const sacas = kgToSacas(contract.quantityKg).toLocaleString("pt-BR");
    const preco = (contract.pricePerSc60Cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const total = (contract.totalValueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const prazo = contract.deliveryDeadline.toLocaleDateString("pt-BR");
    return `Contrato ${contract.number}: ${contract.crop}, ${sacas} sacas, R$ ${preco}/saca, total R$ ${total}, comprador ${contract.buyerOrg.name}, prazo de entrega ${prazo}, status ${contract.status}.`;
  }

  private deterministicSummary(contract: Parameters<AiService["contractFacts"]>[0]): string {
    return `Resumo do contrato ${contract.number}: você vai entregar ${kgToSacas(contract.quantityKg).toLocaleString("pt-BR")} sacas de ${contract.crop} para ${contract.buyerOrg.name}, pelo preço de R$ ${(contract.pricePerSc60Cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por saca, totalizando R$ ${(contract.totalValueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. O prazo de entrega é até ${contract.deliveryDeadline.toLocaleDateString("pt-BR")}. Status atual: ${contract.status}.`;
  }
}
