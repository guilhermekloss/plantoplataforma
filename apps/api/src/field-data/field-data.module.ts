import { Module } from "@nestjs/common";
import { FieldDataController } from "./field-data.controller";
import { FieldDataService } from "./field-data.service";

@Module({
  controllers: [FieldDataController],
  providers: [FieldDataService],
  exports: [FieldDataService],
})
export class FieldDataModule {}
