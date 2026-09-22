import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { EventTypesModule } from "./event-types/event-types.module";
import { IdentityModule } from "./identity/identity.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60000, limit: 10 }],
    }),
    SharedModule,
    IdentityModule,
    AuthModule,
    SchedulesModule,
    NotificationsModule,
    BookingsModule,
    EventTypesModule,
  ],
})
export class AppModule {}


