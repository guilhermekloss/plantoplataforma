import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AccessTokenPayload) {
    return this.dashboard.getSummary(user);
  }
}
