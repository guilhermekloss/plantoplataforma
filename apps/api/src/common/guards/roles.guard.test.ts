import { describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function fakeContext(role: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function fakeReflector(requiredRoles: string[] | undefined): Reflector {
  return { getAllAndOverride: () => requiredRoles } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("permite quando a rota não declara @Roles", () => {
    const guard = new RolesGuard(fakeReflector(undefined));
    expect(guard.canActivate(fakeContext("PRODUCER"))).toBe(true);
  });

  it("permite quando o papel do usuário está na lista exigida", () => {
    const guard = new RolesGuard(fakeReflector(["ADMIN", "OPERATOR"]));
    expect(guard.canActivate(fakeContext("OPERATOR"))).toBe(true);
  });

  it("rejeita quando o papel do usuário não está na lista exigida", () => {
    const guard = new RolesGuard(fakeReflector(["ADMIN"]));
    expect(() => guard.canActivate(fakeContext("PRODUCER"))).toThrow();
  });

  it("rejeita quando não há usuário autenticado no request", () => {
    const guard = new RolesGuard(fakeReflector(["ADMIN"]));
    expect(() => guard.canActivate(fakeContext(undefined))).toThrow();
  });
});
