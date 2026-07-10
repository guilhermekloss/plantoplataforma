import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FieldDataService } from "./field-data.service";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard)
@Controller("field-data")
export class FieldDataController {
  constructor(private readonly fieldData: FieldDataService) {}

  @Get("overview")
  overview(@CurrentUser() user: TenantContext) {
    return this.fieldData.overview(user.tenantId);
  }
}
