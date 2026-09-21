-- AlterTable
ALTER TABLE "event_types" ADD COLUMN     "after_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "before_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minimum_notice_minutes" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Working Hours',
    "time_zone" TEXT NOT NULL DEFAULT 'UTC',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_overrides" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "is_unavailable" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TEXT,
    "end_time" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_user_id_is_default_idx" ON "schedules"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "schedule_days_schedule_id_day_of_week_idx" ON "schedule_days"("schedule_id", "day_of_week");

-- CreateIndex
CREATE INDEX "schedule_overrides_schedule_id_date_idx" ON "schedule_overrides"("schedule_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_overrides_schedule_id_date_key" ON "schedule_overrides"("schedule_id", "date");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
