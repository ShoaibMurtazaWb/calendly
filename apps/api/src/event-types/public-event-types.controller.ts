import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { publicEventTypeParamsSchema, type PublicEventTypeParams } from "@sched/api-contract";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { EventTypesService } from "./event-types.service";

@ApiTags("public")
@Controller("api/v1/public")
export class PublicEventTypesController {
  constructor(private readonly eventTypes: EventTypesService) {}

  @Get(":username/:eventSlug")
  @ApiOperation({ summary: "Public read of an active event type" })
  get(@Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams) {
    return this.eventTypes.getPublic(params.username, params.eventSlug);
  }
}
