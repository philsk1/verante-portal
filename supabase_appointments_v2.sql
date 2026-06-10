-- Appointments table — missing columns
-- Run in Supabase SQL Editor. All idempotent.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES catalogue_items(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intake_answers text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_id uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_index integer;
