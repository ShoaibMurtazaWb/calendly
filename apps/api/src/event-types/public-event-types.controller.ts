import { Controller, Get, Logger, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  getPublicSlotsQuerySchema,
  publicEventTypeParamsSchema,
  publicHostParamsSchema,
  type GetPublicSlotsQuery,
  type PublicEventTypeParams,
  type PublicHostParams,
} from "@sched/api-contract";
import { GoogleCalendarService } from "../integrations/services/google-calendar.service";
import { SchedulesService } from "../schedules/schedules.service";
import { SlotsService } from "../schedules/slots.service";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { PrismaService } from "../shared/prisma/prisma.service";
import { EventTypesService } from "./event-types.service";

@ApiTags("public")
@Controller("api/v1/public")
@UseGuards(ThrottlerGuard)
export class PublicEventTypesController {
  private readonly logger = new Logger("PublicEventTypesController");

  constructor(
    private readonly eventTypes: EventTypesService,
    private readonly schedules: SchedulesService,
    private readonly slots: SlotsService,
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService
  ) {}

  @Get(":username")
  @ApiOperation({ summary: "Public read of host profile and active event types" })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getHostProfile(@Param(zodPipe(publicHostParamsSchema)) params: PublicHostParams) {
    return this.eventTypes.getPublicHostProfile(params.username);
  }

  @Get(":username/:eventSlug")
  @ApiOperation({ summary: "Public read of an active event type" })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  get(@Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams) {
    return this.eventTypes.getPublic(params.username, params.eventSlug);
  }

  @Get(":username/:eventSlug/slots")
  @ApiOperation({ summary: "Calculate available booking slots for an active event type" })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getSlots(
    @Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams,
    @Query(zodPipe(getPublicSlotsQuerySchema)) query: GetPublicSlotsQuery
  ) {
    const eventType = await this.eventTypes.getPublicRaw(params.username, params.eventSlug);
    const schedule = await this.schedules.getDefaultSchedule(eventType.userId);

    const startBoundary = new Date(query.startDate + "T00:00:00Z");
    const endBoundary = new Date(query.endDate + "T23:59:59Z");

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        hostId: eventType.userId,
        status: "CONFIRMED",
        startTime: { lte: endBoundary },
        endTime: { gte: startBoundary },
      },
      select: { startTime: true, endTime: true },
    });

    // Query Google FreeBusy with explicit 1500ms timeout and fail-open degraded mode
    let googleBusyIntervals: Array<{ startTime: Date; endTime: Date }> = [];
    try {
      const blocks = await this.googleCalendar.getFreeBusyIntervals(
        eventType.userId,
        startBoundary,
        endBoundary,
        1500
      );
      googleBusyIntervals = blocks.map((b) => ({
        startTime: b.start,
        endTime: b.end,
      }));
    } catch (err) {
      // Degraded-mode policy: slot browsing fails open (logs warning and continues with DB availability)
      this.logger.warn(
        `Failed to fetch Google FreeBusy for host ${eventType.userId} during slot browsing. Operating in degraded mode.`,
        err
      );
    }

    const allBusyIntervals = [...existingBookings, ...googleBusyIntervals];

    return this.slots.computeAvailableSlots(
      schedule,
      eventType,
      query.startDate,
      query.endDate,
      query.timezone,
      new Date(),
      allBusyIntervals
    );
  }
}


