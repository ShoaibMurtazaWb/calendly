-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BOOKING_CONFIRMED_ATTENDEE', 'BOOKING_CONFIRMED_HOST', 'BOOKING_CANCELLED_ATTENDEE', 'BOOKING_CANCELLED_HOST');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_jobs" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "recipient_email" CITEXT NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_jobs_idempotency_key_key" ON "notification_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_jobs_status_next_run_at_idx" ON "notification_jobs"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "notification_jobs_booking_id_idx" ON "notification_jobs"("booking_id");

-- AddForeignKey
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
