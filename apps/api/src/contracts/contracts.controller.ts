import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { ContractsService } from './contracts.service';
import {
  createContractSchema,
  listContractsSchema,
  reasonSchema,
  signSchema,
  updateContractSchema,
  type CreateContractDto,
  type ListContractsDto,
  type ReasonDto,
  type SignDto,
  type UpdateContractDto,
} from './contracts.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Roles('admin', 'operator')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createContractSchema)) dto: CreateContractDto,
  ) {
    return this.contracts.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(listContractsSchema)) query: ListContractsDto,
  ) {
    return this.contracts.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.contracts.findOne(user, id);
  }

  @Roles('admin', 'operator')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContractSchema)) dto: UpdateContractDto,
  ) {
    return this.contracts.update(user, id, dto);
  }

  @Roles('admin', 'operator')
  @Post(':id/submit')
  submit(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.contracts.submit(user, id);
  }

  @Post(':id/sign')
  sign(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(signSchema)) _dto: SignDto,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.contracts.sign(user, id, ip, userAgent);
  }

  @Post(':id/dispute')
  dispute(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) dto: ReasonDto,
  ) {
    return this.contracts.dispute(user, id, dto.reason);
  }

  @Roles('admin', 'operator')
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) dto: ReasonDto,
  ) {
    return this.contracts.cancel(user, id, dto.reason);
  }

  @Get(':id/events')
  events(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.contracts.events(user, id);
  }
}
