import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionCookieService } from "./session-cookie.service";
import { SessionService } from "./session.service";

@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionCookieService, SessionAuthGuard],
  exports: [SessionAuthGuard, SessionService, PasswordService],
})
export class AuthModule {}
