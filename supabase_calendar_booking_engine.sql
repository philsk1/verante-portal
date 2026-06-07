-- ─── Calendar booking engine migration ───────────────────────────────────────
-- Run in Supabase SQL Editor. Safe to re-run (all IF NOT EXISTS).

-- appointments: service link, recurring series, intake answers
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id uuid references catalogue_items(id) on delete set null;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_id uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_index integer default 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intake_answers text;

-- staff_profiles: skill mapping + display colour
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS colour text;

-- tenants: reminder cadence + no-show / cancellation policy
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminder_48h boolean default true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminder_24h boolean default true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminder_1h boolean default false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS no_show_fee numeric;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancel_cutoff_hrs integer default 24;

-- staff_availability: add unique constraint for upsert
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS id uuid default gen_random_uuid();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_availability_staff_day_unique'
  ) THEN
    ALTER TABLE staff_availability
      ADD CONSTRAINT staff_availability_staff_day_unique
      UNIQUE (staff_profile_id, day_of_week);
  END IF;
END $$;
