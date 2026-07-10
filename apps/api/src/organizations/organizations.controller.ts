import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { OrganizationsService } from "./organizations.service";
import { searchOrganizationsSchema, type SearchOrganizationsDto } from "./dto/search-organizations.schema";

@UseGuards(JwtAuthGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  search(@Query(new ZodValidationPipe(searchOrganizationsSchema)) query: SearchOrganizationsDto) {
    return this.organizations.search(query.type, query.q);
  }
}
