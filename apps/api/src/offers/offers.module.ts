import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [ContractsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
