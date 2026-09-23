-- CreateEnum
CREATE TYPE "BookingActor" AS ENUM ('HOST', 'ATTENDEE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_RESCHEDULED_ATTENDEE';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_RESCHEDULED_HOST';

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reschedule_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rescheduled_at" TIMESTAMPTZ(6),
  ADD COLUMN "rescheduled_by" "BookingActor",
  ADD COLUMN "reschedule_reason" TEXT,
  ADD COLUMN "previous_start_time" TIMESTAMPTZ(6),
  ADD COLUMN "previous_end_time" TIMESTAMPTZ(6);

-- Convert existing cancelled_by to BookingActor
ALTER TABLE "bookings" ALTER COLUMN "cancelled_by" TYPE "BookingActor" USING "cancelled_by"::"BookingActor";

-- CreateTable
CREATE TABLE "booking_reschedule_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "previous_start_time" TIMESTAMPTZ(6) NOT NULL,
    "previous_end_time" TIMESTAMPTZ(6) NOT NULL,
    "new_start_time" TIMESTAMPTZ(6) NOT NULL,
    "new_end_time" TIMESTAMPTZ(6) NOT NULL,
    "rescheduled_by" "BookingActor" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reschedule_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_reschedule_history_booking_id_sequence_idx" ON "booking_reschedule_history"("booking_id", "sequence");

-- CreateIndex
CREATE INDEX "booking_reschedule_history_booking_id_created_at_idx" ON "booking_reschedule_history"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "booking_reschedule_history" ADD CONSTRAINT "booking_reschedule_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
