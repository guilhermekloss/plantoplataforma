import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Contract } from '@prisma/client';
import {
  GRAIN_TYPES,
  breakEvenCentsPerSack,
  estimateTotalSacks,
  indicativePriceCents,
} from '@plantor/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { assertContractAccess, contractAccessWhere } from '../prisma/contract-access';
import { openOfferReadingIds } from '../offers/open-offers';
import { climateIntelligence } from '../field-data/climate-intelligence';
import { satelliteView } from '../field-data/providers/satellite.provider';
import { qualityFromReading, type GrainQualityScore } from '../field-data/providers/quality-score';
import { GeminiService, ChatMessage } from './gemini.service';

const GRAIN_PT: Record<(typeof GRAIN_TYPES)[number], string> = {
  soja: 'soja',
  milho: 'milho',
  cafe: 'café',
  trigo: 'trigo',
  algodao: 'algodão',
  sorgo: 'sorgo',
  feijao: 'feijão',
};

function brl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 3600 * 1000));
}

export interface ContractFigures {
  grain: string;
  quantitySacks: number;
  perSackBrl: string | null;
  totalBrl: string | null;
  totalCents: number | null;
  penaltyBrl: string | null;
  penaltyPct: number;
  deadline: string;
  daysToDeadline: number;
  maxMoisturePct: number;
  qualityAdjType: string;
  transport: string;
  hasWashout: boolean;
}

function figures(contract: Contract): ContractFigures {
  const qty = Number(contract.quantitySacks);
  const perSackCents = contract.priceValueCents != null ? Number(contract.priceValueCents) : null;
  const totalCents = perSackCents != null ? perSackCents * qty : null;
  const penaltyPct = Number(contract.penaltyPct);
  const penaltyCents = totalCents != null ? Math.round((totalCents * penaltyPct) / 100) : null;
  return {
    grain: GRAIN_PT[contract.grainType],
    quantitySacks: qty,
    perSackBrl: perSackCents != null ? brl(perSackCents) : null,
    totalBrl: totalCents != null ? brl(totalCents) : null,
    totalCents,
    penaltyBrl: penaltyCents != null ? brl(penaltyCents) : null,
    penaltyPct,
    deadline: contract.deliveryDeadline.toLocaleDateString('pt-BR'),
    daysToDeadline: daysUntil(contract.deliveryDeadline),
    maxMoisturePct: Number(contract.maxMoisturePct),
    qualityAdjType: contract.qualityAdjType,
    transport: contract.transportResponsible === 'seller' ? 'o produtor' : 'o comprador',
    hasWashout: contract.hasWashoutClause,
  };
}

const EXPLAIN_SYSTEM = `Você é um assistente da Plantor que explica contratos de grãos para PRODUTORES RURAIS brasileiros, em português simples e direto, no celular.
Regras:
- Zero juridiquês. Frases curtas. Use os NÚMEROS exatos que eu te der; nunca invente valores ou datas.
- Seja honesto sobre riscos (multa, wash out, desconto por umidade) — o produtor precisa entender no que está se comprometendo ANTES de assinar.
- Responda direto, sem preâmbulo. Use markdown com no máximo estes blocos, nesta ordem:
  **Resumo** (1 frase), **Você está se comprometendo a** (bullets), **Fique atento** (bullets com riscos em R$), **Datas**.
- Não dê conselho jurídico nem mande "procure um advogado"; apenas explique de forma clara.`;

function assistantSystem(contextBlock: string): string {
  return `Você é a assistente da Plantor para PRODUTORES RURAIS, em português simples e direto, no celular.
Você ajuda o produtor a entender os contratos dele, prazos, quanto vai receber e descontos por qualidade.
Regras:
- Responda curto e direto, sem preâmbulo. Use os dados dos contratos abaixo; não invente números, datas ou contratos.
- Desconto por umidade: o desconto incide quando a umidade medida passa do máximo do contrato. Tipos: "proportional" = 0,7% de desconto por 1% acima; "fixed_pct" = 2% se passar; "rejection" = 100% (rejeita); "none" = sem desconto. Mostre a conta quando fizer sentido.
- Se a pergunta não tiver a ver com os contratos do produtor, diga gentilmente que você só ajuda com os contratos dele na Plantor.
- Nunca dê aconselhamento jurídico.

CONTRATOS DO PRODUTOR (dados reais):
${contextBlock}`;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: GeminiService,
  ) {}

  async explainContract(user: AccessTokenPayload, id: string) {
    const ctx = { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role };
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);

    const f = figures(contract);

    if (!this.llm.enabled) {
      return {
        enabled: false,
        explanation: fallbackExplanation(contract.contractNumber, f),
        figures: f,
      };
    }

    const facts = [
      `Contrato ${contract.contractNumber}.`,
      `Grão: ${f.grain}. Quantidade: ${f.quantitySacks} sacas.`,
      f.perSackBrl
        ? `Preço por saca: ${f.perSackBrl}. Valor total: ${f.totalBrl}.`
        : 'Preço: a definir (média de mercado).',
      `Entrega até ${f.deadline} (${f.daysToDeadline} dias). Frete por conta de ${f.transport}.`,
      `Qualidade: umidade máxima ${f.maxMoisturePct}%. Tipo de ajuste por qualidade: ${f.qualityAdjType}.`,
      `Multa (cláusula penal): ${f.penaltyPct}% do valor total${f.penaltyBrl ? ` = ${f.penaltyBrl}` : ''}.`,
      `Cláusula wash out: ${f.hasWashout ? 'sim (se não entregar, pode pagar a diferença do preço de mercado)' : 'não'}.`,
      '',
      'Explique este contrato para o produtor.',
    ].join('\n');

    try {
      const explanation = await this.llm.complete(
        EXPLAIN_SYSTEM,
        [{ role: 'user', content: facts }],
        1500,
      );
      return { enabled: true, explanation, figures: f };
    } catch (err) {
      this.logger.warn(`Gemini indisponível (explainContract): ${(err as Error).message}`);
      return {
        enabled: false,
        explanation: fallbackExplanation(contract.contractNumber, f),
        figures: f,
      };
    }
  }

  async assistant(user: AccessTokenPayload, message: string, history: ChatMessage[] = []) {
    if (!this.llm.enabled) {
      return {
        enabled: false,
        reply:
          'A assistente com inteligência artificial ainda não está ativada nesta conta. Você pode ver seus contratos, prazos e entregas no painel.',
      };
    }

    const ctx = { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role };
    const contracts = await this.prisma.contract.findMany({
      where: contractAccessWhere(ctx),
      include: { buyer: { select: { name: true } } },
      orderBy: { deliveryDeadline: 'asc' },
      take: 25,
    });

    const contextBlock =
      contracts.length === 0
        ? '(nenhum contrato encontrado)'
        : contracts
            .map((c) => {
              const f = figures(c);
              return `- ${c.contractNumber} | ${f.grain} | ${f.quantitySacks} sacas | comprador: ${c.buyer?.name ?? '—'} | status: ${c.status} | entrega: ${f.deadline} (${f.daysToDeadline}d) | preço/saca: ${f.perSackBrl ?? 'a definir'} | total: ${f.totalBrl ?? '—'} | umidade máx: ${f.maxMoisturePct}% | ajuste: ${f.qualityAdjType} | multa: ${f.penaltyPct}%`;
            })
            .join('\n');

    const messages: ChatMessage[] = [...history.slice(-10), { role: 'user', content: message }];
    try {
      const reply = await this.llm.complete(assistantSystem(contextBlock), messages, 1024);
      return { enabled: true, reply };
    } catch (err) {
      this.logger.warn(`Gemini indisponível (assistant): ${(err as Error).message}`);
      return {
        enabled: false,
        reply:
          'A assistente com inteligência artificial está temporariamente indisponível (limite de uso atingido). Tente novamente em alguns minutos — enquanto isso, você pode ver seus contratos, prazos e entregas no painel.',
      };
    }
  }

  /**
   * Agente que PROPÕE contratos/ofertas a partir dos lotes do produtor:
   * imediatas (lote colhido e apto) e ANTECIPADAS/a termo (lavoura em
   * desenvolvimento, volume estimado por NDVI de satélite — exige confirmação).
   * Números (quantidade, preço, valor) são determinísticos no servidor; a IA
   * apenas gera o texto de recomendação. Sem IA, usa um texto padrão.
   */
  async suggestContracts(user: AccessTokenPayload) {
    // Exclui lotes que já têm oferta aberta.
    const [readings, withOffer] = await Promise.all([
      this.prisma.fieldReading.findMany({
        where: { organizationId: user.orgId, status: { in: ['disponivel', 'em_desenvolvimento'] } },
        orderBy: { collectedAt: 'desc' },
      }),
      openOfferReadingIds(this.prisma, user.orgId),
    ]);
    const lots = readings.filter((r) => !withOffer.has(r.id));

    // Contexto climático regional (simulado): a anomalia de chuva dos próximos
    // 15 dias entra como componente do preço sugerido — quebra regional segura
    // preço firme para quem já tem grão colhido e armazenado.
    const climate = climateIntelligence(
      [],
      readings.map((r) => ({ grainType: r.grainType, status: r.status })),
    );
    const rainAnomalyPct = climate.rainOutlook.anomalyPct;

    const base = lots.flatMap((r) => {
      const grain = GRAIN_PT[r.grainType];
      const referenceCents = indicativePriceCents(r.grainType) ?? 0;
      const growing = r.status === 'em_desenvolvimento';
      const priceContext = suggestedPriceFor(r, referenceCents, rainAnomalyPct);
      const priceCents = priceContext.suggestedPriceCents;

      let qty: number;
      let yieldRange: { min: number; max: number } | null = null;
      if (growing) {
        // Volume ESTIMADO por sensoriamento remoto — sem estimativa, não sugere.
        const sat = satelliteView({
          id: r.id,
          grainType: r.grainType,
          plantingDate: r.plantingDate,
          ndviAvg: r.ndviAvg != null ? Number(r.ndviAvg) : null,
          status: r.status,
        });
        if (sat?.estimatedYieldSacksPerHa == null) return [];
        qty = estimateTotalSacks(sat.estimatedYieldSacksPerHa, Number(r.areaHa));
        yieldRange = sat.yieldRangeSacksPerHa;
      } else {
        qty =
          r.availableSacks != null
            ? Number(r.availableSacks)
            : estimateTotalSacks(Number(r.yieldSacksPerHa), Number(r.areaHa));
      }

      return [
        {
          fieldReadingId: r.id,
          grainType: r.grainType,
          grainLabel: grain,
          harvestYear: r.harvestYear,
          offerType: (growing ? 'antecipada' : 'imediata') as 'antecipada' | 'imediata',
          estimated: growing,
          quantitySacks: qty,
          yieldRangeSacksPerHa: yieldRange,
          suggestedPriceCents: priceCents,
          priceContext,
          estimatedGrossValueCents: Math.round(qty * priceCents),
          storedMoisturePct: r.storedMoisturePct != null ? Number(r.storedMoisturePct) : null,
          ndviAvg: r.ndviAvg != null ? Number(r.ndviAvg) : null,
          frostEvents: r.frostEvents,
        },
      ];
    });

    if (base.length === 0) {
      return { enabled: this.llm.enabled, suggestions: [] };
    }

    // Texto padrão (fallback)
    const withTemplate = base.map((b) => ({
      ...b,
      headline:
        b.offerType === 'antecipada'
          ? `Oferta antecipada: ~${b.quantitySacks.toLocaleString('pt-BR')} sacas de ${b.grainLabel} (estimativa por satélite)`
          : `Ofertar ${b.quantitySacks.toLocaleString('pt-BR')} sacas de ${b.grainLabel}`,
      rationale:
        b.offerType === 'antecipada'
          ? `Lavoura em desenvolvimento com volume estimado por NDVI${b.yieldRangeSacksPerHa ? ` (${b.yieldRangeSacksPerHa.min}–${b.yieldRangeSacksPerHa.max} sc/ha)` : ''}. A ${brl(b.suggestedPriceCents)}/saca, um contrato a termo renderia cerca de ${brl(b.estimatedGrossValueCents)} — confirme o volume antes de ofertar.`
          : `Lote colhido e armazenado (umidade ${b.storedMoisturePct ?? '—'}%), apto à venda. A ${brl(b.suggestedPriceCents)}/saca, renderia cerca de ${brl(b.estimatedGrossValueCents)}.`,
    }));

    if (!this.llm.enabled) {
      return { enabled: false, suggestions: withTemplate };
    }

    const system = `Você é o agente comercial da Plantor para PRODUTORES RURAIS. A partir dos lotes abaixo, recomende ofertas de venda em português simples e direto.
Lotes com tipoOferta "imediata" estão colhidos e aptos; lotes "antecipada" ainda estão em desenvolvimento e o volume é ESTIMADO por satélite (NDVI) — nesse caso deixe claro que é um contrato a termo com volume estimado, a confirmar.
Para CADA lote, devolva uma "headline" curta (ex.: "Ofertar 1.500 sacas de soja") e um "rationale" de 1–2 frases dizendo se vale ofertar agora e por quê (considere umidade armazenada, NDVI/qualidade e geadas no ciclo). Não invente números — use os fornecidos.
Responda APENAS com um array JSON: [{"fieldReadingId","headline","rationale"}]. Sem texto fora do JSON.`;
    const payload = base.map((b) => ({
      fieldReadingId: b.fieldReadingId,
      grao: b.grainLabel,
      tipoOferta: b.offerType,
      sacas: b.quantitySacks,
      faixaProdutividadeScHa: b.yieldRangeSacksPerHa,
      precoReferenciaPorSaca: (b.suggestedPriceCents / 100).toFixed(2),
      valorEstimado: (b.estimatedGrossValueCents / 100).toFixed(2),
      umidadeArmazenada: b.storedMoisturePct,
      ndvi: b.ndviAvg,
      geadasNoCiclo: b.frostEvents,
    }));

    try {
      const raw = await this.llm.complete(
        system,
        [{ role: 'user', content: JSON.stringify(payload) }],
        1200,
      );
      const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
      const parsed = JSON.parse(json) as {
        fieldReadingId: string;
        headline: string;
        rationale: string;
      }[];
      const byId = new Map(parsed.map((p) => [p.fieldReadingId, p]));
      const suggestions = base.map((b, i) => {
        const ai = byId.get(b.fieldReadingId);
        return {
          ...b,
          headline: ai?.headline ?? withTemplate[i]!.headline,
          rationale: ai?.rationale ?? withTemplate[i]!.rationale,
        };
      });
      return { enabled: true, suggestions };
    } catch {
      return { enabled: true, suggestions: withTemplate };
    }
  }

  /**
   * Avaliação da COOPERATIVA: a qualidade do lote justifica o preço pedido?
   * Números 100% determinísticos no servidor (score de qualidade, preço justo
   * ajustado pela qualidade, delta vs. referência); a IA só redige a análise.
   */
  async evaluateOffer(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { fieldReading: true, seller: { select: { name: true } } },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');

    const quality = qualityFromReading(offer.fieldReading);
    const refCents = indicativePriceCents(offer.grainType);
    const askingCents = offer.askingPriceCents != null ? Number(offer.askingPriceCents) : null;

    // Preço "justo": referência ajustada pela qualidade — score 80 é o neutro.
    // Cada ponto vale 0,15% (clamp −6%…+3%): grão nota 95 justifica ~+2%.
    const qualityAdjPct =
      refCents != null ? Math.max(-6, Math.min(3, (quality.score - 80) * 0.15)) : null;
    const fairPriceCents =
      refCents != null && qualityAdjPct != null
        ? Math.round(refCents * (1 + qualityAdjPct / 100))
        : null;

    let verdict: 'preco_justificado' | 'negociavel' | 'acima_do_justo' | 'sem_preco';
    if (askingCents == null || fairPriceCents == null) {
      verdict = 'sem_preco';
    } else if (askingCents <= Math.round(fairPriceCents * 1.01)) {
      verdict = 'preco_justificado';
    } else if (askingCents <= Math.round(fairPriceCents * 1.05)) {
      verdict = 'negociavel';
    } else {
      verdict = 'acima_do_justo';
    }

    const figures = {
      grainLabel: GRAIN_PT[offer.grainType],
      quantitySacks: Number(offer.quantitySacks),
      askingPriceCents: askingCents,
      referencePriceCents: refCents,
      qualityAdjPct: qualityAdjPct != null ? Math.round(qualityAdjPct * 10) / 10 : null,
      fairPriceCents,
      deltaVsFairCents:
        askingCents != null && fairPriceCents != null ? askingCents - fairPriceCents : null,
      totalCents: askingCents != null ? askingCents * Number(offer.quantitySacks) : null,
    };

    const fallback = fallbackOfferEvaluation(verdict, quality, figures);
    if (!this.llm.enabled) {
      return { enabled: false, verdict, quality, figures, analysis: fallback };
    }

    const system = `Você é o analista de originação da Plantor para COOPERATIVAS compradoras de grãos. Avalie se a QUALIDADE do lote justifica o PREÇO pedido, em português direto e profissional.
Regras:
- Use APENAS os números fornecidos; nunca invente valores. O veredito já foi calculado — explique-o, não o contradiga.
- Cite os fatores de qualidade relevantes (rastreabilidade: umidade, NDVI, geadas, armazenagem) e o que fazer: aceitar, negociar (com contraproposta ancorada no preço justo) ou recusar.
- Máximo 4 frases, sem markdown, sem preâmbulo.`;
    const payload = {
      veredito: verdict,
      lote: `${figures.quantitySacks} sacas de ${figures.grainLabel} de ${offer.seller.name}`,
      precoPedidoPorSaca: askingCents != null ? (askingCents / 100).toFixed(2) : null,
      precoReferencia: refCents != null ? (refCents / 100).toFixed(2) : null,
      precoJustoAjustadoQualidade:
        fairPriceCents != null ? (fairPriceCents / 100).toFixed(2) : null,
      qualidade: {
        score: quality.score,
        grade: quality.grade,
        confianca: quality.confidence,
        fatores: quality.factors.map((f) => `${f.label} (${f.deltaPts} pts): ${f.detail}`),
      },
    };
    try {
      const analysis = await this.llm.complete(
        system,
        [{ role: 'user', content: JSON.stringify(payload) }],
        1500,
      );
      return { enabled: true, verdict, quality, figures, analysis };
    } catch (err) {
      this.logger.warn(`Gemini indisponível (evaluateOffer): ${(err as Error).message}`);
      return { enabled: false, verdict, quality, figures, analysis: fallback };
    }
  }
}

export interface SuggestedPriceContext {
  referencePriceCents: number;
  qualityAdjPct: number;
  climateAdjPct: number;
  suggestedPriceCents: number;
  breakEvenCentsPerSack: number | null;
  /** Explicações curtas de cada componente do preço, exibidas ao produtor. */
  drivers: string[];
}

/**
 * Preço sugerido = referência de mercado ± qualidade do lote ± contexto
 * climático regional. Transparente e determinístico: cada componente vira um
 * "driver" legível para o produtor entender por que pode pedir mais (ou não).
 */
function suggestedPriceFor(
  r: Parameters<typeof qualityFromReading>[0],
  referenceCents: number,
  rainAnomalyPct: number,
): SuggestedPriceContext {
  const drivers: string[] = [];

  const quality = qualityFromReading(r);
  // Score 80 é o neutro; cada ponto vale 0,15% (mesma régua da avaliação do comprador).
  const qualityAdjPct =
    Math.round(Math.max(-6, Math.min(3, (quality.score - 80) * 0.15)) * 10) / 10;
  if (qualityAdjPct > 0) {
    drivers.push(
      `Qualidade nota ${quality.score} (classe ${quality.grade}) sustenta +${qualityAdjPct.toLocaleString('pt-BR')}% sobre a referência.`,
    );
  } else if (qualityAdjPct < 0) {
    drivers.push(
      `Qualidade nota ${quality.score} (classe ${quality.grade}) pressiona o preço em ${qualityAdjPct.toLocaleString('pt-BR')}%.`,
    );
  }

  let climateAdjPct = 0;
  const stored = r.status !== 'em_desenvolvimento';
  if (rainAnomalyPct <= -15) {
    climateAdjPct = stored ? 2 : 1;
    drivers.push(
      `Previsão de chuva ${Math.abs(rainAnomalyPct)}% abaixo da média regional — oferta apertada tende a firmar o preço${stored ? ' de grão já armazenado' : ''}.`,
    );
  } else if (rainAnomalyPct >= 30) {
    climateAdjPct = stored ? 1 : -1;
    drivers.push(
      stored
        ? `Excesso de chuva previsto (+${rainAnomalyPct}% vs. média) atrapalha colheitas na região — grão seco e armazenado ganha prêmio.`
        : `Excesso de chuva previsto (+${rainAnomalyPct}% vs. média) aumenta o risco da lavoura em campo — margem de segurança no preço a termo.`,
    );
  }

  const suggestedPriceCents = Math.round(
    referenceCents * (1 + (qualityAdjPct + climateAdjPct) / 100),
  );

  const cost = r.productionCost as { totalCostCentsPerHa?: number } | null;
  const breakEven =
    cost?.totalCostCentsPerHa != null
      ? breakEvenCentsPerSack(cost.totalCostCentsPerHa, Number(r.yieldSacksPerHa))
      : null;
  if (breakEven != null && suggestedPriceCents < breakEven) {
    drivers.push(
      `Atenção: o preço sugerido fica abaixo do seu custo de ${brl(breakEven)}/saca — avalie segurar o lote.`,
    );
  }

  return {
    referencePriceCents: referenceCents,
    qualityAdjPct,
    climateAdjPct,
    suggestedPriceCents,
    breakEvenCentsPerSack: breakEven,
    drivers,
  };
}

interface OfferEvalFigures {
  grainLabel: string;
  quantitySacks: number;
  askingPriceCents: number | null;
  referencePriceCents: number | null;
  qualityAdjPct: number | null;
  fairPriceCents: number | null;
  deltaVsFairCents: number | null;
  totalCents: number | null;
}

function fallbackOfferEvaluation(
  verdict: 'preco_justificado' | 'negociavel' | 'acima_do_justo' | 'sem_preco',
  quality: GrainQualityScore,
  f: OfferEvalFigures,
): string {
  const base = `Lote de ${f.grainLabel} com qualidade nota ${quality.score} (classe ${quality.grade}, confiança ${quality.confidence} nos dados de campo).`;
  if (verdict === 'sem_preco' || f.fairPriceCents == null || f.askingPriceCents == null) {
    return `${base} A oferta não tem preço definido — use ${
      f.fairPriceCents != null ? brl(f.fairPriceCents) : 'a referência de mercado'
    }/saca como âncora de negociação.`;
  }
  const fair = brl(f.fairPriceCents);
  const asking = brl(f.askingPriceCents);
  if (verdict === 'preco_justificado') {
    return `${base} O preço pedido de ${asking}/saca está dentro do justo para essa qualidade (${fair}/saca) — a rastreabilidade sustenta a compra.`;
  }
  if (verdict === 'negociavel') {
    return `${base} O pedido de ${asking}/saca está um pouco acima do justo para essa qualidade (${fair}/saca) — vale negociar ancorando a contraproposta nesse valor.`;
  }
  return `${base} O pedido de ${asking}/saca supera o que a qualidade sustenta (${fair}/saca) — recomenda-se contraproposta ou recusa.`;
}

function fallbackExplanation(contractNumber: string, f: ContractFigures): string {
  const lines = [
    `**Resumo**`,
    `Contrato ${contractNumber}: você vende ${f.quantitySacks} sacas de ${f.grain}${f.totalBrl ? `, por cerca de ${f.totalBrl}` : ''}, com entrega até ${f.deadline}.`,
    ``,
    `**Você está se comprometendo a**`,
    `- Entregar ${f.quantitySacks} sacas de ${f.grain} até ${f.deadline} (${f.daysToDeadline} dias).`,
    `- Frete por conta de ${f.transport}.`,
    `- Respeitar a umidade máxima de ${f.maxMoisturePct}%.`,
    ``,
    `**Fique atento**`,
    `- Se não entregar, a multa é de ${f.penaltyPct}%${f.penaltyBrl ? ` (${f.penaltyBrl})` : ''}.`,
    f.hasWashout
      ? `- Tem cláusula *wash out*: se faltar grão, você pode pagar a diferença do preço de mercado.`
      : `- Sem cláusula wash out.`,
    f.qualityAdjType !== 'none'
      ? `- Umidade acima de ${f.maxMoisturePct}% gera desconto no pagamento.`
      : `- Sem desconto por umidade neste contrato.`,
    ``,
    `**Datas**`,
    `- Entrega até ${f.deadline}.`,
  ];
  return lines.join('\n');
}
