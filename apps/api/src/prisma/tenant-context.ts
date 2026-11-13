/**
 * Contexto de tenant por requisição.
 *
 * Preenchido pelo guard de autenticação (Módulo 1) a partir do JWT — NUNCA do
 * client. Armazenado em CLS (continuation-local storage) para que o middleware
 * de RLS do Prisma consiga lê-lo sem tornar o PrismaService request-scoped.
 */
export const TENANT_CONTEXT_KEY = 'tenantContext';

export interface TenantContext {
  /** organizationId == tenantId do usuário autenticado. */
  orgId: string;
  /** tenantId (igual a orgId no MVP). */
  tenantId: string;
  /** id do usuário autenticado. */
  userId: string;
  /** papel do usuário. */
  role: string;
}

/**
 * Models "donos" de um tenant — recebem o filtro CEGO por tenantId no middleware.
 *
 * IMPORTANTE (decisão arquitetural do PROMPT_MVP.md):
 * - `Contract` NÃO entra aqui: cruza dois tenants (comprador e produtor). Seu
 *   acesso é pela regra OR(buyerId, sellerId) — ver contract-access.ts.
 * - `Organization` NÃO entra aqui: o comprador precisa ler a org do produtor
 *   (contraparte) e buscar produtores no wizard. O acesso à própria org é feito
 *   por métodos de serviço específicos usando ctx.orgId.
 * - Os filhos do contrato (ContractEvent, ContractSignature, Delivery,
 *   QualityReport) não têm tenantId próprio: a autorização é pelo contrato pai,
 *   na camada de serviço.
 *
 * No MVP nenhum model de "configuração de organização" existe ainda, então a
 * lista começa vazia — o mecanismo está pronto para esses models na Fase 02.
 */
export const TENANT_OWNED_MODELS: readonly string[] = [];
