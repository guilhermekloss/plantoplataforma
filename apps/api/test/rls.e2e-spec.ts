import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { contractAccessWhere } from '../src/prisma/contract-access';
import type { TenantContext } from '../src/prisma/tenant-context';

/**
 * Teste de integração contra PostgreSQL real (Docker) — fecha os critérios de
 * RLS do Módulo 0:
 *  - usuário do tenant A não lê dados do tenant B;
 *  - produtor (tenant diferente do comprador) enxerga o contrato em que é seller.
 *
 * Exercita a regra de acesso documentada (contractAccessWhere) — OR(buyer, seller).
 */
const prisma = new PrismaClient();

const ctx = (orgId: string, role = 'admin'): TenantContext => ({
  orgId,
  tenantId: orgId,
  userId: `${orgId}-user`,
  role,
});

let coopAId: string;
let producerAId: string;
let coopBId: string;
let producerBId: string;
let contractAId: string;
let contractBId: string;

beforeAll(async () => {
  // Limpa em ordem de dependência.
  await prisma.offer.deleteMany();
  await prisma.fieldReading.deleteMany();
  await prisma.qualityReport.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractEvent.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const coopA = await prisma.organization.create({
    data: {
      tenantId: 'rls-coop-a',
      id: 'rls-coop-a',
      type: 'cooperative',
      name: 'Coop A',
      email: 'coop-a@test.local',
      users: { create: { email: 'op-a@test.local', passwordHash: 'x', name: 'Op A', role: 'admin' } },
    },
    include: { users: true },
  });
  const producerA = await prisma.organization.create({
    data: {
      tenantId: 'rls-prod-a',
      id: 'rls-prod-a',
      type: 'producer',
      name: 'Produtor A',
      email: 'prod-a@test.local',
      users: { create: { email: 'joao-a@test.local', passwordHash: 'x', name: 'João A', role: 'producer' } },
    },
  });
  const coopB = await prisma.organization.create({
    data: {
      tenantId: 'rls-coop-b',
      id: 'rls-coop-b',
      type: 'cooperative',
      name: 'Coop B',
      email: 'coop-b@test.local',
      users: { create: { email: 'op-b@test.local', passwordHash: 'x', name: 'Op B', role: 'admin' } },
    },
    include: { users: true },
  });
  const producerB = await prisma.organization.create({
    data: {
      tenantId: 'rls-prod-b',
      id: 'rls-prod-b',
      type: 'producer',
      name: 'Produtor B',
      email: 'prod-b@test.local',
      users: { create: { email: 'joao-b@test.local', passwordHash: 'x', name: 'João B', role: 'producer' } },
    },
  });

  coopAId = coopA.id;
  producerAId = producerA.id;
  coopBId = coopB.id;
  producerBId = producerB.id;

  const baseContract = {
    grainType: 'soja' as const,
    quantitySacks: 1000,
    harvestYear: '2025/2026',
    harvestPeriod: 'unica' as const,
    qualityAdjType: 'proportional' as const,
    priceType: 'fixo' as const,
    warehouseName: 'Armazém',
    warehouseAddress: { city: 'Não-Me-Toque', state: 'RS' },
    deliveryDeadline: new Date('2026-05-31T00:00:00.000Z'),
    transportResponsible: 'seller' as const,
  };

  const contractA = await prisma.contract.create({
    data: {
      ...baseContract,
      tenantId: coopAId,
      contractNumber: 'PLT-RLS-A',
      sellerId: producerAId,
      buyerId: coopAId,
      createdById: coopA.users[0]!.id,
    },
  });
  const contractB = await prisma.contract.create({
    data: {
      ...baseContract,
      tenantId: coopBId,
      contractNumber: 'PLT-RLS-B',
      sellerId: producerBId,
      buyerId: coopBId,
      createdById: coopB.users[0]!.id,
    },
  });
  contractAId = contractA.id;
  contractBId = contractB.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('RLS — acesso a Contract pela regra buyer/seller', () => {
  it('comprador (Coop A) lê apenas o contrato A', async () => {
    const rows = await prisma.contract.findMany({ where: contractAccessWhere(ctx(coopAId)) });
    expect(rows.map((c) => c.id)).toEqual([contractAId]);
  });

  it('produtor A (tenant DIFERENTE do comprador) enxerga o contrato em que é seller', async () => {
    const rows = await prisma.contract.findMany({ where: contractAccessWhere(ctx(producerAId)) });
    expect(rows.map((c) => c.id)).toEqual([contractAId]);
  });

  it('tenant A não enxerga o contrato do tenant B (isolamento)', async () => {
    const rows = await prisma.contract.findMany({ where: contractAccessWhere(ctx(coopAId)) });
    expect(rows.map((c) => c.id)).not.toContain(contractBId);
  });

  it('org sem relação com nenhum contrato não vê nada', async () => {
    const rows = await prisma.contract.findMany({ where: contractAccessWhere(ctx('rls-stranger')) });
    expect(rows).toHaveLength(0);
  });

  it('comprador B lê apenas o contrato B', async () => {
    const rows = await prisma.contract.findMany({ where: contractAccessWhere(ctx(coopBId)) });
    expect(rows.map((c) => c.id)).toEqual([contractBId]);
  });
});
