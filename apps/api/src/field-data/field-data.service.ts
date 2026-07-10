import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../prisma/prisma.service";
import { estimateGrossValueCents, type Crop } from "@plantor/shared";

@Injectable()
export class FieldDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async overview(tenantId: string) {
    const readings = await this.prisma.fieldReading.findMany({
      where: { organizationId: tenantId },
      orderBy: { readingDate: "desc" },
      take: 20,
    });

    // Sem model de área por talhão associado à leitura ainda — devolvemos a
    // receita estimada POR HECTARE (área=1); o simulador what-if no /campo
    // multiplica pela área real que o produtor informar.
    const withEstimate = readings.map((reading) => ({
      ...reading,
      estimatedRevenuePerHectareCents:
        reading.yieldScHa != null ? estimateGrossValueCents(reading.crop as Crop, reading.yieldScHa, 1) : null,
    }));

    return { readings: withEstimate };
  }

  /**
   * Usado pelo ContractsService para anexar snapshot agronômico no
   * contrato — é uma leitura CROSS-TENANT deliberada (o comprador, ao criar
   * o contrato, precisa ler a última leitura de campo do VENDEDOR). O
   * middleware de RLS filtra cego por `context.tenantId` (o comprador
   * autenticado) e sobrescreveria o `organizationId` do vendedor que
   * passamos aqui. Por isso rodamos a query dentro de `cls.exit()`, que sai
   * do contexto CLS atual — o middleware não injeta filtro nenhum ali
   * dentro (sem tenant context = sem filtro), e o contexto do request
   * original volta normal depois que o callback termina. (`cls.run()` NÃO
   * serve aqui: ele roda DENTRO do contexto compartilhado atual.)
   *
   * Importante: o `await` da query precisa estar DENTRO do callback do
   * `exit()`. `prisma.fieldReading.findFirst(...)` retorna uma
   * PrismaPromise preguiçosa — só dispara o middleware quando resolvida.
   * Se o callback só retorna a promise sem dar `await` nela, a resolução
   * (e o middleware) roda depois que `exit()` já devolveu o controle pro
   * contexto original, e o filtro cego é injetado do mesmo jeito.
   */
  async latestReadingFor(organizationId: string, crop: Crop) {
    return this.cls.exit(async () => {
      return await this.prisma.fieldReading.findFirst({
        where: { organizationId, crop },
        orderBy: { readingDate: "desc" },
      });
    });
  }
}
