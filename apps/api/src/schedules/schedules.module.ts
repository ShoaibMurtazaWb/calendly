import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SchedulesController } from "./schedules.controller";
import { SchedulesService } from "./schedules.service";
import { SlotsService } from "./slots.service";

@Module({
  imports: [AuthModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SlotsService],
  exports: [SchedulesService, SlotsService],
})
export class SchedulesModule {}
