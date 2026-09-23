-- AlterTable
ALTER TABLE "event_types" ADD COLUMN "custom_questions" JSONB;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "custom_responses" JSONB;
