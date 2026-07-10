import { describe, expect, it, vi } from "vitest";
import type { ClsService } from "nestjs-cls";
import { createTenantRlsMiddleware } from "./tenant-rls.middleware";
import type { TenantContext } from "../cls/tenant-context";

function fakeCls(context?: TenantContext): ClsService {
  return { get: () => context } as unknown as ClsService;
}

const next = vi.fn(async (params: unknown) => params);

describe("tenant-rls.middleware", () => {
  it("injeta where.organizationId para models em TENANT_OWNED_MODELS", async () => {
    const middleware = createTenantRlsMiddleware(fakeCls({ tenantId: "org_1", userId: "u_1", role: "PRODUCER" }));
    const params = { model: "User", action: "findMany" as const, args: { where: { email: "a@b.com" } } };

    await middleware(params, next);

    expect(params.args.where).toEqual({ email: "a@b.com", organizationId: "org_1" });
  });

  it("NÃO filtra Contract (compartilhado entre tenants, usa contract-access.ts)", async () => {
    const middleware = createTenantRlsMiddleware(fakeCls({ tenantId: "org_1", userId: "u_1", role: "PRODUCER" }));
    const params = { model: "Contract", action: "findMany" as const, args: { where: {} } };

    await middleware(params, next);

    expect(params.args.where).toEqual({});
  });

  it("NÃO filtra Organization (comprador precisa buscar orgs de produtor)", async () => {
    const middleware = createTenantRlsMiddleware(fakeCls({ tenantId: "org_1", userId: "u_1", role: "OPERATOR" }));
    const params = { model: "Organization", action: "findMany" as const, args: { where: {} } };

    await middleware(params, next);

    expect(params.args.where).toEqual({});
  });

  it("NÃO filtra ações fora da lista (ex.: create)", async () => {
    const middleware = createTenantRlsMiddleware(fakeCls({ tenantId: "org_1", userId: "u_1", role: "PRODUCER" }));
    const params = { model: "User", action: "create" as const, args: { data: { email: "a@b.com" } } };

    await middleware(params, next);

    expect(params.args).toEqual({ data: { email: "a@b.com" } });
  });

  it("sem tenant context (fora de request autenticada), não filtra", async () => {
    const middleware = createTenantRlsMiddleware(fakeCls(undefined));
    const params = { model: "User", action: "findMany" as const, args: { where: {} } };

    await middleware(params, next);

    expect(params.args.where).toEqual({});
  });
});
