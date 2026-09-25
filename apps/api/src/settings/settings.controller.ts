import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ProfileSettingsSchema,
  NotificationPreferencesSchema,
  SchedulingPreferencesSchema,
  type ProfileSettings,
  type NotificationPreferences,
  type SchedulingPreferences,
} from "@sched/api-contract";
import { CurrentUserId } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { SettingsService } from "./settings.service";
import { AuditService } from "../audit/audit.service";

@ApiTags("settings")
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller("api/v1/settings")
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's profile and preferences" })
  getSettings(@CurrentUserId() userId: string) {
    return this.settings.getSettings(userId);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update profile settings (name, username, timezone, avatar)" })
  updateProfile(
    @CurrentUserId() userId: string,
    @Body(zodPipe(ProfileSettingsSchema)) body: ProfileSettings,
  ) {
    return this.settings.updateProfile(userId, body);
  }

  @Patch("notifications")
  @ApiOperation({ summary: "Update notification preferences" })
  updateNotifications(
    @CurrentUserId() userId: string,
    @Body(zodPipe(NotificationPreferencesSchema)) body: NotificationPreferences,
  ) {
    return this.settings.updateNotificationPreferences(userId, body);
  }

  @Patch("scheduling")
  @ApiOperation({ summary: "Update default scheduling preferences" })
  updateScheduling(
    @CurrentUserId() userId: string,
    @Body(zodPipe(SchedulingPreferencesSchema)) body: SchedulingPreferences,
  ) {
    return this.settings.updateSchedulingPreferences(userId, body);
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Get recent audit trail logs for the current user" })
  getAuditLogs(@CurrentUserId() userId: string) {
    return this.audit.getLogsForUser(userId);
  }
}
