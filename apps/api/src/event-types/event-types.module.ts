import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventTypesController } from "./event-types.controller";
import { EventTypesService } from "./event-types.service";
import { PublicEventTypesController } from "./public-event-types.controller";

@Module({
  imports: [AuthModule],
  controllers: [EventTypesController, PublicEventTypesController],
  providers: [EventTypesService],
})
export class EventTypesModule {}
