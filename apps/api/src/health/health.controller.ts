import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", service: "plantor-api", timestamp: new Date().toISOString() };
  }
}
