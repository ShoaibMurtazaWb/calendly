import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  cancelBookingBodySchema,
  listBookingsQuerySchema,
  type CancelBookingBody,
  type ListBookingsQuery,
} from "@sched/api-contract";
import { CurrentUserId } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { BookingsService } from "./bookings.service";
import { z } from "zod";

const bookingIdParamSchema = z.object({
  id: z.string().uuid("Invalid booking id"),
});

@ApiTags("bookings")
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller("api/v1/bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: "List bookings for the authenticated host" })
  list(
    @CurrentUserId() userId: string,
    @Query(zodPipe(listBookingsQuerySchema)) query: ListBookingsQuery
  ) {
    return this.bookings.getHostBookings(userId, query);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel a booking as the host" })
  cancel(
    @CurrentUserId() userId: string,
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(cancelBookingBodySchema)) body: CancelBookingBody
  ) {
    return this.bookings.cancelByHost(userId, params.id, body.reason);
  }
}
