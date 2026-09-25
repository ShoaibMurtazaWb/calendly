import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { SharedModule } from "../shared/shared.module";

@Global()
@Module({
  imports: [SharedModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
