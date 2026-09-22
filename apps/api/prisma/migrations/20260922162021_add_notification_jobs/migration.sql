/*
  Warnings:

  - The `status` column on the `notification_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `notification_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED_ATTENDEE', 'BOOKING_CONFIRMED_HOST', 'BOOKING_CANCELLED_ATTENDEE', 'BOOKING_CANCELLED_HOST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "notification_jobs" ADD COLUMN     "locked_at" TIMESTAMPTZ(6),
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "notification_status";

-- DropEnum
DROP TYPE "notification_type";

-- CreateIndex
CREATE INDEX "notification_jobs_status_next_run_at_idx" ON "notification_jobs"("status", "next_run_at");
