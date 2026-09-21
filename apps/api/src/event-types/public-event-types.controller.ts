import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  getPublicSlotsQuerySchema,
  publicEventTypeParamsSchema,
  publicHostParamsSchema,
  type GetPublicSlotsQuery,
  type PublicEventTypeParams,
  type PublicHostParams,
} from "@sched/api-contract";
import { SchedulesService } from "../schedules/schedules.service";
import { SlotsService } from "../schedules/slots.service";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { EventTypesService } from "./event-types.service";

@ApiTags("public")
@Controller("api/v1/public")
export class PublicEventTypesController {
  constructor(
    private readonly eventTypes: EventTypesService,
    private readonly schedules: SchedulesService,
    private readonly slots: SlotsService
  ) {}

  @Get(":username")
  @ApiOperation({ summary: "Public read of host profile and active event types" })
  getHostProfile(@Param(zodPipe(publicHostParamsSchema)) params: PublicHostParams) {
    return this.eventTypes.getPublicHostProfile(params.username);
  }

  @Get(":username/:eventSlug")
  @ApiOperation({ summary: "Public read of an active event type" })
  get(@Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams) {
    return this.eventTypes.getPublic(params.username, params.eventSlug);
  }

  @Get(":username/:eventSlug/slots")
  @ApiOperation({ summary: "Calculate available booking slots for an active event type" })
  async getSlots(
    @Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams,
    @Query(zodPipe(getPublicSlotsQuerySchema)) query: GetPublicSlotsQuery
  ) {
    const eventType = await this.eventTypes.getPublicRaw(params.username, params.eventSlug);
    const schedule = await this.schedules.getDefaultSchedule(eventType.userId);
    return this.slots.computeAvailableSlots(
      schedule,
      eventType,
      query.startDate,
      query.endDate,
      query.timezone
    );
  }
}
