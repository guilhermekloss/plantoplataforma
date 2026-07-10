import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DashboardService } from "./dashboard.service";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary(@CurrentUser() user: TenantContext) {
    return this.dashboard.summary(user.tenantId);
  }
}
