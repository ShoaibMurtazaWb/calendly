import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  cancelBookingBodySchema,
  createBookingBodySchema,
  publicEventTypeParamsSchema,
  rescheduleBookingBodySchema,
  type CancelBookingBody,
  type CreateBookingBody,
  type PublicEventTypeParams,
  type RescheduleBookingBody,
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
@UseGuards(ThrottlerGuard)
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post(":username/:eventSlug/book")
  @ApiOperation({ summary: "Book a time slot with a host" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(
    @Param(zodPipe(publicEventTypeParamsSchema)) params: PublicEventTypeParams,
    @Body(zodPipe(createBookingBodySchema)) body: CreateBookingBody
  ) {
    return this.bookings.createBooking(params.username, params.eventSlug, body);
  }

  @Get("bookings/:id")
  @ApiOperation({ summary: "Get public booking confirmation details" })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  get(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Query("token") queryToken?: string,
    @Headers("x-booking-token") headerToken?: string
  ) {
    const token = headerToken || queryToken;
    return this.bookings.getPublicBooking(params.id, token);
  }

  @Get("bookings/:id/ics")
  @ApiOperation({ summary: "Download .ics iCalendar file for a booking" })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getIcs(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Res() res: Response,
    @Query("token") queryToken?: string,
    @Headers("x-booking-token") headerToken?: string
  ) {
    const token = headerToken || queryToken;
    const { filename, content } = await this.bookings.getIcsContent(params.id, token);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(content);
  }

  @Patch("bookings/:id/cancel")
  @ApiOperation({ summary: "Cancel a booking as the attendee" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  cancel(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(cancelBookingBodySchema)) body: CancelBookingBody,
    @Query("token") queryToken?: string,
    @Headers("x-booking-token") headerToken?: string
  ) {
    const token = headerToken || queryToken;
    return this.bookings.cancelByAttendee(params.id, token, body.expectedSequence, body.reason);
  }

  @Patch("bookings/:id/reschedule")
  @ApiOperation({ summary: "Reschedule a booking as the attendee" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  reschedule(
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(rescheduleBookingBodySchema)) body: RescheduleBookingBody,
    @Query("token") queryToken?: string,
    @Headers("x-booking-token") headerToken?: string
  ) {
    const token = headerToken || queryToken;
    return this.bookings.rescheduleByAttendee(params.id, token, body);
  }
}
