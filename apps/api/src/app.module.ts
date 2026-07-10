import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateEnv } from "./config/env.schema";
import { TenantClsModule } from "./common/cls/cls.module";
import { GuardsModule } from "./common/guards/guards.module";
import { PrismaModule } from "./prisma/prisma.module";
import { EmailModule } from "./email/email.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { FieldDataModule } from "./field-data/field-data.module";
import { LotesModule } from "./lotes/lotes.module";
import { OffersModule } from "./offers/offers.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    TenantClsModule,
    GuardsModule,
    PrismaModule,
    EmailModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    ContractsModule,
    DashboardModule,
    DeliveriesModule,
    NotificationsModule,
    AiModule,
    FieldDataModule,
    LotesModule,
    OffersModule,
  ],
})
export class AppModule {}
