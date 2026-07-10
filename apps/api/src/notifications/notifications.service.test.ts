import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import type { EmailService } from "../email/email.service";
import { DEADLINE_WARNING_DAYS, NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consulta contratos com deliveryDeadline dentro da janela de aviso a partir de 'agora'", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contract: { findMany, update: vi.fn() } } as unknown as PrismaService;
    const email = { send: vi.fn() } as unknown as EmailService;

    const service = new NotificationsService(prisma, email);
    await service.checkUpcomingDeadlines();

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];

    expect(args.where.status).toEqual({ in: ["ASSINADO", "ENTREGA_PARCIAL"] });
    expect(args.where.deadlineWarningSentAt).toBeNull();

    const expectedWindowEnd = new Date(
      Date.now() + DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000,
    );
    expect(args.where.deliveryDeadline.lte.toISOString()).toBe(expectedWindowEnd.toISOString());
    expect(expectedWindowEnd.toISOString()).toBe("2026-08-09T12:00:00.000Z");
  });

  it("envia e-mail pra usuários de comprador e vendedor e marca deadlineWarningSentAt", async () => {
    const contract = {
      id: "contract_1",
      number: "PLT-2026-0001",
      deliveryDeadline: new Date("2026-07-20T00:00:00.000Z"),
      buyerOrg: { users: [{ email: "comprador@example.com" }] },
      sellerOrg: { users: [{ email: "vendedor@example.com" }] },
    };
    const findMany = vi.fn().mockResolvedValue([contract]);
    const update = vi.fn().mockResolvedValue({});
    const prisma = { contract: { findMany, update } } as unknown as PrismaService;
    const send = vi.fn().mockResolvedValue(undefined);
    const email = { send } as unknown as EmailService;

    const service = new NotificationsService(prisma, email);
    const count = await service.checkUpcomingDeadlines();

    expect(count).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((c) => c[0].to)).toEqual(
      expect.arrayContaining(["comprador@example.com", "vendedor@example.com"]),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "contract_1" },
      data: { deadlineWarningSentAt: expect.any(Date) },
    });
  });

  it("não notifica contratos fora da janela (já filtrados pela query, aqui garantimos que não reprocessa manualmente)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contract: { findMany, update: vi.fn() } } as unknown as PrismaService;
    const email = { send: vi.fn() } as unknown as EmailService;

    const service = new NotificationsService(prisma, email);
    const count = await service.checkUpcomingDeadlines();

    expect(count).toBe(0);
    expect(email.send).not.toHaveBeenCalled();
  });
});
