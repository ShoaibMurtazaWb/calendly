import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  analyticsQuerySchema,
  type AnalyticsQuery,
  type HostAnalyticsResponse,
} from "@sched/api-contract";
import { CurrentUserId } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller("api/v1/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get aggregated booking analytics and meeting insights" })
  getOverview(
    @CurrentUserId() userId: string,
    @Query(zodPipe(analyticsQuerySchema)) query: AnalyticsQuery
  ): Promise<HostAnalyticsResponse> {
    return this.analytics.getHostAnalytics(userId, query);
  }
}
