import {
  calculatePriceAdjustment,
  type ContractStatus,
  type QualityAdjType,
} from '@plantor/shared';

/**
 * Assistente determinística (sem LLM): responde as perguntas mais comuns do
 * produtor — prazos, quanto vai receber, desconto por umidade, multa — a partir
 * dos dados REAIS dos contratos dele. É o que roda quando não há
 * GEMINI_API_KEY ou quando o Gemini está indisponível, para o chat nunca ficar
 * mudo. Nunca inventa números: tudo sai dos contratos recebidos.
 */

export interface AssistantContractFacts {
  contractNumber: string;
  status: ContractStatus;
  grain: string;
  quantitySacks: number;
  buyerName: string;
  deadline: string; // dd/mm/aaaa
  daysToDeadline: number;
  perSackBrl: string | null;
  totalBrl: string | null;
  totalCents: number | null;
  maxMoisturePct: number;
  qualityAdjType: QualityAdjType;
  penaltyPct: number;
  penaltyBrl: string | null;
  hasWashout: boolean;
}

const STATUS_PT: Record<ContractStatus, string> = {
  rascunho: 'rascunho',
  pendente_assinatura_comprador: 'aguardando assinatura do comprador',
  pendente_assinatura_produtor: 'aguardando a sua assinatura',
  assinado: 'assinado',
  em_execucao: 'em andamento',
  entregue_parcial: 'com entrega parcial',
  disputado: 'em disputa',
  liquidado: 'concluído',
  cancelado: 'cancelado',
};

const ADJ_PT: Record<QualityAdjType, string> = {
  proportional: '0,7% de desconto para cada 1 ponto de umidade acima do máximo',
  fixed_pct: 'desconto fixo de 2% se passar do máximo',
  rejection: 'a carga pode ser rejeitada se passar do máximo',
  none: 'sem desconto por umidade',
};

function brl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function num(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Contratos que ainda pedem algo do produtor (assinar, entregar) — exclui só os encerrados. */
const CLOSED_STATUSES: ContractStatus[] = ['liquidado', 'cancelado'];

function isOpen(c: AssistantContractFacts): boolean {
  return !CLOSED_STATUSES.includes(c.status);
}

function line(c: AssistantContractFacts): string {
  return `${c.contractNumber} — ${num(c.quantitySacks)} sacas de ${c.grain} para ${c.buyerName}, ${STATUS_PT[c.status]}`;
}

function deadlineText(c: AssistantContractFacts): string {
  if (c.daysToDeadline < 0) return `${c.deadline} (venceu há ${-c.daysToDeadline} dias)`;
  if (c.daysToDeadline === 0) return `${c.deadline} (hoje)`;
  return `${c.deadline} (faltam ${c.daysToDeadline} dias)`;
}

/** Contrato citado pelo número (PLT-2026-0003) ou, na falta, pelo grão. */
function pickContracts(text: string, contracts: AssistantContractFacts[]): AssistantContractFacts[] {
  const byNumber = contracts.filter((c) => text.includes(normalize(c.contractNumber)));
  if (byNumber.length > 0) return byNumber;
  const byGrain = contracts.filter((c) => text.includes(normalize(c.grain)));
  return byGrain;
}

function moistureFrom(text: string): number | null {
  const m = text.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:%|por ?cento)/);
  if (!m?.[1]) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 0 && v < 60 ? v : null;
}

function answerMoisture(moisture: number, pool: AssistantContractFacts[]): string {
  const lines = pool.map((c) => {
    const pct = calculatePriceAdjustment(
      { maxMoisturePct: c.maxMoisturePct, qualityAdjType: c.qualityAdjType },
      { moisturePct: moisture },
    );
    if (pct === 0) {
      return `- ${c.contractNumber} (${c.grain}): com ${num(moisture)}% de umidade não há desconto — o máximo do contrato é ${num(c.maxMoisturePct)}%.`;
    }
    if (c.qualityAdjType === 'rejection') {
      return `- ${c.contractNumber} (${c.grain}): ${num(moisture)}% passa do máximo de ${num(c.maxMoisturePct)}% e a carga pode ser rejeitada.`;
    }
    const value = c.totalCents != null ? ` — cerca de ${brl(Math.round((c.totalCents * pct) / 100))} sobre o valor total` : '';
    const how =
      c.qualityAdjType === 'proportional'
        ? ` (${num(moisture - c.maxMoisturePct)} ponto(s) acima × 0,7%)`
        : '';
    return `- ${c.contractNumber} (${c.grain}): desconto de ${num(pct)}%${how}${value}.`;
  });
  return [`Com ${num(moisture)}% de umidade na entrega:`, ...lines].join('\n');
}

export function fallbackAssistantReply(message: string, contracts: AssistantContractFacts[]): string {
  if (contracts.length === 0) {
    return 'Ainda não encontrei contratos na sua conta. Quando uma cooperativa ou trading fechar um contrato com você, eu explico prazos, valores e descontos por aqui.';
  }

  const text = normalize(message);
  const open = contracts.filter(isOpen);
  const picked = pickContracts(text, contracts);
  const pool = picked.length > 0 ? picked : open.length > 0 ? open : contracts;
  const moisture = moistureFrom(text);

  // Desconto por umidade com número ("e se der 14,5% de umidade?")
  if (moisture != null && /umid|descont|%|por ?cento/.test(text)) {
    return answerMoisture(moisture, pool);
  }

  // Regras de desconto/qualidade sem número
  if (/umid|descont|qualidade|laudo|classifica/.test(text)) {
    return [
      'Desconto por umidade nos seus contratos:',
      ...pool.map(
        (c) => `- ${c.contractNumber} (${c.grain}): máximo de ${num(c.maxMoisturePct)}% — ${ADJ_PT[c.qualityAdjType]}.`,
      ),
      '',
      'Me diga a umidade que você espera (ex.: "e se der 14%?") que eu faço a conta.',
    ].join('\n');
  }

  // Multa / wash out
  if (/multa|penal|wash|nao entregar|quebra|descumpr/.test(text)) {
    return [
      'Se não entregar o combinado:',
      ...pool.map(
        (c) =>
          `- ${c.contractNumber} (${c.grain}): multa de ${num(c.penaltyPct)}%${c.penaltyBrl ? ` (${c.penaltyBrl})` : ''}${
            c.hasWashout ? '; tem cláusula wash out (pode pagar a diferença do preço de mercado)' : ''
          }.`,
      ),
    ].join('\n');
  }

  // Quanto vou receber
  if (/receb|valor|quanto|pag|dinheiro|preco|total/.test(text)) {
    const withValue = pool.filter((c) => c.totalCents != null);
    const sum = withValue.reduce((s, c) => s + (c.totalCents ?? 0), 0);
    return [
      'Valores dos seus contratos:',
      ...pool.map(
        (c) =>
          `- ${c.contractNumber}: ${num(c.quantitySacks)} sc de ${c.grain} × ${c.perSackBrl ?? 'preço a definir'}${
            c.totalBrl ? ` = ${c.totalBrl}` : ''
          }.`,
      ),
      ...(withValue.length > 1 ? ['', `Somando: ${brl(sum)} (antes de descontos por qualidade).`] : []),
    ].join('\n');
  }

  // Prazos de entrega
  if (/prazo|entreg|venc|quando|data|dia/.test(text)) {
    const sorted = [...pool].sort((a, b) => a.daysToDeadline - b.daysToDeadline);
    return [
      'Prazos de entrega:',
      ...sorted.map((c) => `- ${c.contractNumber} (${c.grain}): até ${deadlineText(c)}.`),
    ].join('\n');
  }

  // Contrato específico citado → resumo
  if (picked.length > 0) {
    return picked
      .map((c) =>
        [
          `${line(c)}.`,
          `- Entrega até ${deadlineText(c)}.`,
          `- Preço: ${c.perSackBrl ?? 'a definir'}${c.totalBrl ? ` por saca, total ${c.totalBrl}` : ''}.`,
          `- Umidade máxima ${num(c.maxMoisturePct)}% — ${ADJ_PT[c.qualityAdjType]}.`,
          `- Multa por não entregar: ${num(c.penaltyPct)}%${c.penaltyBrl ? ` (${c.penaltyBrl})` : ''}.`,
        ].join('\n'),
      )
      .join('\n\n');
  }

  // Visão geral
  return [
    `Você tem ${contracts.length} contrato(s)${open.length ? `, ${open.length} em aberto` : ''}:`,
    ...contracts.map((c) => `- ${line(c)}.`),
    '',
    'Posso te dizer prazos de entrega, quanto você vai receber, a multa ou o desconto por umidade (ex.: "e se der 14% de umidade?").',
  ].join('\n');
}
