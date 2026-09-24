import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PublicBookingsController } from "./public-bookings.controller";

@Module({
  imports: [AuthModule, SchedulesModule, NotificationsModule, IntegrationsModule],
  controllers: [BookingsController, PublicBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
