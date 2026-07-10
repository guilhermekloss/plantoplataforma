import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { InviteService } from "./invite.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, InviteService],
  exports: [PasswordService],
})
export class AuthModule {}
