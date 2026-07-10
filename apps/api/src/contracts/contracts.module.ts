import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { FieldDataModule } from "../field-data/field-data.module";

@Module({
  imports: [FieldDataModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
