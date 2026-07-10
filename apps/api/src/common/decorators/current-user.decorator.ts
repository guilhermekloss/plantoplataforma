import { createParamDecorator } from "@nestjs/common";
import { ClsServiceManager } from "nestjs-cls";
import { getTenantContext, type TenantContext } from "../cls/tenant-context";

/**
 * Injeta o TenantContext (tenantId/userId/role) populado pelo JwtAuthGuard.
 * createParamDecorator roda fora do container de DI, por isso usa
 * ClsServiceManager.getClsService() em vez de injetar ClsService no construtor.
 */
export const CurrentUser = createParamDecorator((): TenantContext => {
  return getTenantContext(ClsServiceManager.getClsService());
});
