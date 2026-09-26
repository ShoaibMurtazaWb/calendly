import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Root welcome endpoint" })
  getRoot() {
    return {
      status: "ok",
      service: "Sched API",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  getHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
