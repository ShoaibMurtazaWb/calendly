-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "attendee_name" TEXT NOT NULL,
    "attendee_email" CITEXT NOT NULL,
    "attendee_timezone" TEXT NOT NULL,
    "attendee_notes" TEXT NOT NULL DEFAULT '',
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_host_id_start_time_status_idx" ON "bookings"("host_id", "start_time", "status");

-- CreateIndex
CREATE INDEX "bookings_event_type_id_start_time_status_idx" ON "bookings"("event_type_id", "start_time", "status");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
