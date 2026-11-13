import { describe, expect, it } from 'vitest';
import { canonicalize } from '../canonical-json.js';
import { classifyGrade, defaultQualityParams } from '../mapa-quality.js';
import { calculatePriceAdjustment } from '../quality-adjustment.js';
import { canTransition } from '../contract-state-machine.js';
import { formatContractNumber, isValidNfeKey, sacksToTons } from '../constants.js';

describe('canonicalize', () => {
  it('ordena chaves de forma determinística independentemente da ordem de entrada', () => {
    const a = canonicalize({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalize({ c: { y: 2, z: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":{"y":2,"z":1}}');
  });

  it('serializa Date como ISO e bigint como string', () => {
    expect(canonicalize({ d: new Date('2025-01-01T00:00:00.000Z') })).toBe(
      '{"d":"2025-01-01T00:00:00.000Z"}',
    );
    expect(canonicalize({ n: 10n })).toBe('{"n":"10"}');
  });
});

describe('classifyGrade (MAPA)', () => {
  it('classifica soja dentro do T1', () => {
    expect(
      classifyGrade('soja', {
        moisturePct: 13,
        impurityPct: 0.5,
        damagedPct: 5,
        specificWeightGL: 700,
      }),
    ).toBe('T1');
  });

  it('rebaixa para fora_padrao quando excede todos os limites', () => {
    expect(
      classifyGrade('soja', { moisturePct: 20, impurityPct: 10, damagedPct: 40 }),
    ).toBe('fora_padrao');
  });

  it('default T1 da soja tem PH mínimo 660', () => {
    expect(defaultQualityParams('soja').minSpecificWeightGL).toBe(660);
  });
});

describe('calculatePriceAdjustment', () => {
  it('proportional: 0,7% por 1% de excesso de umidade', () => {
    expect(
      calculatePriceAdjustment({ maxMoisturePct: 14, qualityAdjType: 'proportional' }, { moisturePct: 16 }),
    ).toBeCloseTo(1.4);
  });

  it('rejection: 100% se houver qualquer excesso', () => {
    expect(
      calculatePriceAdjustment({ maxMoisturePct: 14, qualityAdjType: 'rejection' }, { moisturePct: 14.1 }),
    ).toBe(100);
  });

  it('none: nunca desconta', () => {
    expect(
      calculatePriceAdjustment({ maxMoisturePct: 14, qualityAdjType: 'none' }, { moisturePct: 99 }),
    ).toBe(0);
  });
});

describe('máquina de estados', () => {
  it('permite rascunho → pendente_assinatura_comprador', () => {
    expect(canTransition('rascunho', 'pendente_assinatura_comprador')).toBe(true);
  });
  it('bloqueia liquidado → em_execucao', () => {
    expect(canTransition('liquidado', 'em_execucao')).toBe(false);
  });
});

describe('helpers', () => {
  it('formata número de contrato', () => {
    expect(formatContractNumber(2025, 1)).toBe('PLT-2025-0001');
  });
  it('converte sacas em toneladas', () => {
    expect(sacksToTons(1000)).toBe(60);
  });
  it('valida chave de NFe (44 dígitos)', () => {
    expect(isValidNfeKey('1'.repeat(44))).toBe(true);
    expect(isValidNfeKey('1'.repeat(43))).toBe(false);
    expect(isValidNfeKey('x'.repeat(44))).toBe(false);
  });
});
