import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { updateScheduleBodySchema, type UpdateScheduleBody } from "@sched/api-contract";
import { CurrentUserId } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { SchedulesService } from "./schedules.service";

@ApiTags("schedules")
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller("api/v1/schedules")
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get("default")
  @ApiOperation({ summary: "Get default availability schedule for the logged-in user" })
  getDefault(@CurrentUserId() userId: string) {
    return this.schedules.getDefaultSchedule(userId);
  }

  @Put("default")
  @ApiOperation({ summary: "Update default availability schedule for the logged-in user" })
  updateDefault(
    @CurrentUserId() userId: string,
    @Body(zodPipe(updateScheduleBodySchema)) body: UpdateScheduleBody
  ) {
    return this.schedules.updateDefaultSchedule(userId, body);
  }
}
