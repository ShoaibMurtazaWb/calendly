import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  cancelBookingBodySchema,
  listBookingsQuerySchema,
  rescheduleBookingBodySchema,
  type CancelBookingBody,
  type ListBookingsQuery,
  type RescheduleBookingBody,
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
    return this.bookings.cancelByHost(userId, params.id, body.expectedSequence, body.reason);
  }

  @Patch(":id/reschedule")
  @ApiOperation({ summary: "Reschedule a booking as the host" })
  reschedule(
    @CurrentUserId() userId: string,
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(rescheduleBookingBodySchema)) body: RescheduleBookingBody
  ) {
    return this.bookings.rescheduleByHost(userId, params.id, body);
  }

  @Patch(":id/attendee-email")
  @ApiOperation({ summary: "Update attendee email for a booking" })
  updateAttendeeEmail(
    @CurrentUserId() userId: string,
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string },
    @Body(zodPipe(z.object({ email: z.string().email("Please provide a valid email address") }))) body: { email: string }
  ) {
    return this.bookings.updateAttendeeEmail(userId, params.id, body.email);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete a cancelled booking" })
  delete(
    @CurrentUserId() userId: string,
    @Param(zodPipe(bookingIdParamSchema)) params: { id: string }
  ) {
    return this.bookings.deleteByHost(userId, params.id);
  }
}
