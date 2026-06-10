-- Intelligence configuration columns
-- Run in Supabase SQL editor

-- Lunch break per staff per day (stored alongside the day's schedule)
ALTER TABLE staff_availability
  ADD COLUMN IF NOT EXISTS lunch_start  TIME    DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS lunch_mins   INTEGER DEFAULT 0;

-- Per-staff intel config
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS include_in_intel        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS overhead_hours_per_week NUMERIC DEFAULT 0;

-- Per-tenant capacity target
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS capacity_target_pct INTEGER DEFAULT 85;
