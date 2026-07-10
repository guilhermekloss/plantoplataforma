import { describe, expect, it } from "vitest";
import type { ConfigService } from "@nestjs/config";
import { InviteService } from "./invite.service";

function fakeConfig(secret: string): ConfigService {
  return { get: () => secret } as unknown as ConfigService;
}

describe("InviteService", () => {
  it("assina e verifica um convite válido", () => {
    const service = new InviteService(fakeConfig("test-secret-0123456789"));
    const token = service.issue({ email: "produtor@fazenda.example", inviterOrgId: "org_1", inviterName: "Ana" });

    const payload = service.verify(token);

    expect(payload.email).toBe("produtor@fazenda.example");
    expect(payload.inviterOrgId).toBe("org_1");
    expect(payload.inviterName).toBe("Ana");
  });

  it("rejeita token assinado com outro segredo", () => {
    const issuer = new InviteService(fakeConfig("secret-a"));
    const verifier = new InviteService(fakeConfig("secret-b"));
    const token = issuer.issue({ email: "x@example.com", inviterOrgId: "org_1", inviterName: "Ana" });

    expect(() => verifier.verify(token)).toThrow();
  });

  it("rejeita token adulterado", () => {
    const service = new InviteService(fakeConfig("test-secret-0123456789"));
    const token = service.issue({ email: "x@example.com", inviterOrgId: "org_1", inviterName: "Ana" });

    expect(() => service.verify(`${token}tampered`)).toThrow();
  });
});
