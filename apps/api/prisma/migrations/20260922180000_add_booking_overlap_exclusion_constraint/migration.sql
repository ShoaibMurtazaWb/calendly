-- Enable btree_gist extension for UUID and scalar operators in GiST indexes
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enforce no overlapping confirmed bookings per host at the PostgreSQL engine level
ALTER TABLE "bookings"
ADD CONSTRAINT "no_overlapping_confirmed_bookings"
EXCLUDE USING gist (
  "host_id" WITH =,
  tstzrange("start_time", "end_time") WITH &&
)
WHERE ("status" = 'CONFIRMED');
