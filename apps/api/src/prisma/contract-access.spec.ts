import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import {
  assertContractAccess,
  contractAccessWhere,
  isBuyer,
  isSeller,
} from './contract-access';
import type { TenantContext } from './tenant-context';
import { canonicalSha256 } from '../crypto/canonical-hash';

const buyerCtx: TenantContext = { orgId: 'org-buyer', tenantId: 'org-buyer', userId: 'u1', role: 'admin' };
const sellerCtx: TenantContext = {
  orgId: 'org-seller',
  tenantId: 'org-seller',
  userId: 'u2',
  role: 'producer',
};
const strangerCtx: TenantContext = {
  orgId: 'org-other',
  tenantId: 'org-other',
  userId: 'u3',
  role: 'admin',
};

const contract = { buyerId: 'org-buyer', sellerId: 'org-seller' };

describe('contractAccessWhere', () => {
  it('monta filtro OR(buyerId, sellerId)', () => {
    expect(contractAccessWhere(buyerCtx)).toEqual({
      OR: [{ buyerId: 'org-buyer' }, { sellerId: 'org-buyer' }],
    });
  });
});

describe('assertContractAccess', () => {
  it('permite comprador', () => {
    expect(() => assertContractAccess(buyerCtx, contract)).not.toThrow();
  });
  it('permite vendedor (produtor em outro tenant)', () => {
    expect(() => assertContractAccess(sellerCtx, contract)).not.toThrow();
  });
  it('bloqueia quem não é parte', () => {
    expect(() => assertContractAccess(strangerCtx, contract)).toThrow(ForbiddenException);
  });
  it('bloqueia contrato inexistente', () => {
    expect(() => assertContractAccess(buyerCtx, null)).toThrow(ForbiddenException);
  });
});

describe('isBuyer / isSeller', () => {
  it('classifica corretamente as partes', () => {
    expect(isBuyer(buyerCtx, contract)).toBe(true);
    expect(isSeller(sellerCtx, contract)).toBe(true);
    expect(isBuyer(sellerCtx, contract)).toBe(false);
  });
});

describe('canonicalSha256', () => {
  it('é determinístico e independe da ordem das chaves', () => {
    expect(canonicalSha256({ a: 1, b: 2 })).toBe(canonicalSha256({ b: 2, a: 1 }));
  });
  it('produz hex de 64 caracteres (SHA-256)', () => {
    expect(canonicalSha256({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
