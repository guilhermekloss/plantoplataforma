import './common/bigint-serializer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { validateEnv } from './config/env.validation';
import { Env } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { ContractsModule } from './contracts/contracts.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { FieldDataModule } from './field-data/field-data.module';
import { OffersModule } from './offers/offers.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    // CLS: cria um contexto por requisição para o tenant (RLS).
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    // Rate limiting: 100 req/min por IP (configurável via env).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    ContractsModule,
    OrganizationsModule,
    DashboardModule,
    DeliveriesModule,
    NotificationsModule,
    AiModule,
    FieldDataModule,
    OffersModule,
  ],
  controllers: [AppController],
  providers: [
    // Ordem importa: rate limit → autenticação → RBAC.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
