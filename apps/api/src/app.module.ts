import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { EventTypesModule } from "./event-types/event-types.module";
import { IdentityModule } from "./identity/identity.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { SettingsModule } from "./settings/settings.module";
import { SharedModule } from "./shared/shared.module";
import { RequestContextMiddleware } from "./shared/middleware/request-context.middleware";
import { AppController } from "./app.controller";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "default", ttl: 60000, limit: 120 },
        { name: "public", ttl: 60000, limit: 100 },
        { name: "auth", ttl: 60000, limit: 30 },
      ],
    }),
    SharedModule,
    AuditModule,
    IdentityModule,
    AuthModule,
    SchedulesModule,
    IntegrationsModule,
    NotificationsModule,
    BookingsModule,
    EventTypesModule,
    AnalyticsModule,
    SettingsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}



