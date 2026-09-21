import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { EventTypesController } from "./event-types.controller";
import { EventTypesService } from "./event-types.service";
import { PublicEventTypesController } from "./public-event-types.controller";

@Module({
  imports: [AuthModule, SchedulesModule],
  controllers: [EventTypesController, PublicEventTypesController],
  providers: [EventTypesService],
  exports: [EventTypesService],
})
export class EventTypesModule {}
