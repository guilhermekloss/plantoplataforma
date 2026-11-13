import { describe, expect, it } from 'vitest';
import { fallbackAssistantReply, type AssistantContractFacts } from './assistant-fallback';

const soja: AssistantContractFacts = {
  contractNumber: 'PLT-2026-0001',
  status: 'em_execucao',
  grain: 'soja',
  quantitySacks: 1000,
  buyerName: 'Cooperativa Teste',
  deadline: '30/03/2026',
  daysToDeadline: 20,
  perSackBrl: 'R$ 120,00',
  totalBrl: 'R$ 120.000,00',
  totalCents: 12_000_000,
  maxMoisturePct: 14,
  qualityAdjType: 'proportional',
  penaltyPct: 10,
  penaltyBrl: 'R$ 12.000,00',
  hasWashout: true,
};

const milho: AssistantContractFacts = {
  ...soja,
  contractNumber: 'PLT-2026-0002',
  grain: 'milho',
  daysToDeadline: 5,
  deadline: '15/03/2026',
  qualityAdjType: 'rejection',
  totalCents: 6_000_000,
  totalBrl: 'R$ 60.000,00',
};

const liquidado: AssistantContractFacts = { ...soja, contractNumber: 'PLT-2025-0042', status: 'liquidado' };

describe('fallbackAssistantReply', () => {
  it('sem contratos, explica que ainda não há nada', () => {
    expect(fallbackAssistantReply('oi', [])).toMatch(/Ainda não encontrei contratos/);
  });

  it('calcula o desconto proporcional pela umidade informada, em % e R$', () => {
    const reply = fallbackAssistantReply('e se a soja der 15,5% de umidade?', [soja, milho]);
    // 1,5 ponto acima de 14% × 0,7 = 1,05% de R$ 120.000 = R$ 1.260
    expect(reply).toContain('1,05%');
    expect(reply).toMatch(/1\.260,00/);
    expect(reply).not.toContain('PLT-2026-0002'); // filtrou pelo grão citado
  });

  it('avisa rejeição quando o contrato rejeita acima do máximo', () => {
    expect(fallbackAssistantReply('PLT-2026-0002 com 16% de umidade', [soja, milho])).toMatch(
      /rejeitada/,
    );
  });

  it('sem desconto quando a umidade está dentro do máximo', () => {
    expect(fallbackAssistantReply('e com 13% de umidade?', [soja])).toMatch(/não há desconto/);
  });

  it('lista prazos em ordem, incluindo os que aguardam assinatura e excluindo os encerrados', () => {
    const pendente: AssistantContractFacts = {
      ...soja,
      contractNumber: 'PLT-2026-0003',
      status: 'pendente_assinatura_produtor',
      daysToDeadline: 60,
    };
    const reply = fallbackAssistantReply('qual contrato vence primeiro?', [soja, milho, pendente, liquidado]);
    expect(reply.indexOf('PLT-2026-0002')).toBeLessThan(reply.indexOf('PLT-2026-0001'));
    expect(reply).toContain('PLT-2026-0003');
    expect(reply).not.toContain('PLT-2025-0042');
  });

  it('soma quanto o produtor vai receber', () => {
    expect(fallbackAssistantReply('quanto vou receber?', [soja, milho])).toMatch(/180\.000,00/);
  });

  it('explica a multa e o wash out', () => {
    expect(fallbackAssistantReply('qual a multa se eu não entregar?', [soja])).toMatch(
      /10%.*wash out/s,
    );
  });

  it('resume um contrato citado pelo número', () => {
    const reply = fallbackAssistantReply('me fala do PLT-2025-0042', [soja, liquidado]);
    expect(reply).toContain('PLT-2025-0042');
    expect(reply).toContain('concluído');
  });
});
