-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'DEAD_LETTER';

-- AlterEnum
ALTER TYPE "CalendarSyncJobStatus" ADD VALUE IF NOT EXISTS 'DEAD_LETTER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_reminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "booking_confirmations" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "marketing_emails" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_meeting_duration" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_buffer_minutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex on Bookings
CREATE INDEX IF NOT EXISTS "bookings_host_id_created_at_idx" ON "bookings"("host_id", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_host_id_status_created_at_idx" ON "bookings"("host_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_start_time_idx" ON "bookings"("start_time");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings"("created_at");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
