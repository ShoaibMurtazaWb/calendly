import { Body, Controller, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  cancelBookingBodySchema,
  createBookingBodySchema,
  publicEventTypeParamsSchema,
  type CancelBookingBody,
  type CreateBookingBody,
  type PublicEventTypeParams,
} from "@sched/api-contract";
import type { Response } from "express";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { BookingsService } from "./bookings.service";
import { z } from "zod";

const bookingIdParamSchema = z.object({
  id: z.string().uuid("Invalid booking id"),
});

@ApiTags("public-bookings")
@Controller("api/v1/public")
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post(":username/:eventSlug/book")
  @ApiOperation({ summary: "Book a time slot with a host" })
  create(
    @Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams,
    @Body(zodPipe(createBookingBodySchema)) body: CreateBookingBody
  ) {
    return this.bookings.createBooking(params.username, params.eventSlug, body);
  }

  @Get("bookings/:id")
  @ApiOperation({ summary: "Get public booking confirmation details" })
  get(@Param(zodPipe(bookingIdParamSchema)) params: { id: string }) {
    return this.bookings.getPublicBooking(params.id);
  }

  @Get("bookings/:id/ics")
  @ApiOperation({ summary: "Download .ics iCalendar file for a booking" })
  async getIcs(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Res() res: Response
  ) {
    const { filename, content } = await this.bookings.getIcsContent(params.id);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(content);
  }

  @Patch("bookings/:id/cancel")
  @ApiOperation({ summary: "Cancel a booking as the attendee" })
  cancel(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(cancelBookingBodySchema)) body: CancelBookingBody
  ) {
    return this.bookings.cancelByAttendee(params.id, body.reason);
  }
}
