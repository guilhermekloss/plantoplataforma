import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  // Busca de produtores para o wizard (Etapa 1). Restrito a quem cria contratos.
  @Roles('admin', 'operator')
  @Get('producers')
  searchProducers(@Query('q') q?: string) {
    return this.organizations.searchProducers(q);
  }
}
