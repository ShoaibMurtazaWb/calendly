-- CreateEnum
CREATE TYPE "CalendarProviderType" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "CalendarIntegrationStatus" AS ENUM ('CONNECTED', 'REVOKED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarSyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "calendar_integrations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "CalendarProviderType" NOT NULL DEFAULT 'GOOGLE',
    "status" "CalendarIntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "account_email" TEXT NOT NULL,
    "encrypted_access_token" TEXT,
    "encrypted_refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT NOT NULL DEFAULT '',
    "selected_calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "selected_calendar_name" TEXT,
    "conflict_calendar_ids" TEXT[] DEFAULT ARRAY['primary']::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_calendar_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "provider" "CalendarProviderType" NOT NULL DEFAULT 'GOOGLE',
    "calendar_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "last_synced_sequence" INTEGER NOT NULL DEFAULT 0,
    "sync_status" "CalendarSyncStatus" NOT NULL DEFAULT 'SYNCED',
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "external_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_jobs" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" "CalendarSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_integrations_user_id_status_idx" ON "calendar_integrations"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integrations_user_id_provider_key" ON "calendar_integrations"("user_id", "provider");

-- CreateIndex
CREATE INDEX "external_calendar_events_integration_id_external_event_id_idx" ON "external_calendar_events"("integration_id", "external_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_calendar_events_booking_id_integration_id_key" ON "external_calendar_events"("booking_id", "integration_id");

-- CreateIndex
CREATE INDEX "calendar_sync_jobs_status_next_run_at_idx" ON "calendar_sync_jobs"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "calendar_sync_jobs_booking_id_idx" ON "calendar_sync_jobs"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_jobs_booking_id_integration_id_sequence_key" ON "calendar_sync_jobs"("booking_id", "integration_id", "sequence");

-- AddForeignKey
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_jobs" ADD CONSTRAINT "calendar_sync_jobs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_jobs" ADD CONSTRAINT "calendar_sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
