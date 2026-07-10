import { Global, Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";

/**
 * Contexto por-requisição (tenant atual, usuário atual) propagado via
 * AsyncLocalStorage. Populado pelo JwtAuthGuard a cada request autenticada.
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  exports: [ClsModule],
})
export class TenantClsModule {}
