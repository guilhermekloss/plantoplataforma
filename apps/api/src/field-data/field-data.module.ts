import { Module } from '@nestjs/common';
import { FieldDataController } from './field-data.controller';
import { FieldDataService } from './field-data.service';

@Module({
  controllers: [FieldDataController],
  providers: [FieldDataService],
})
export class FieldDataModule {}
