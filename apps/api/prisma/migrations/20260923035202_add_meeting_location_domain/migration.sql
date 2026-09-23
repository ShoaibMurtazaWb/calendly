-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('IN_PERSON', 'HOST_CALLS_ATTENDEE', 'ATTENDEE_CALLS_HOST', 'CUSTOM_LINK', 'STATIC_VIDEO');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "attendee_phone_number" TEXT,
ADD COLUMN     "location_data" JSONB,
ADD COLUMN     "location_type" "LocationType";

-- AlterTable
ALTER TABLE "event_types" ADD COLUMN     "location_data" JSONB,
ADD COLUMN     "location_type" "LocationType";
