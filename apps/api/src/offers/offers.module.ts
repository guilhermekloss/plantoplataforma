import { Module } from "@nestjs/common";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { ContractsModule } from "../contracts/contracts.module";

@Module({
  imports: [ContractsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
