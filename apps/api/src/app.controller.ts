import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'plantor-api',
      timestamp: new Date().toISOString(),
    };
  }
}
