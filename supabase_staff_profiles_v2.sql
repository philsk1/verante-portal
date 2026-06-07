-- Staff profiles v2 — extended fields
-- Run in Supabase SQL Editor

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS address      text;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS birthday     date;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS private_notes text;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS colour       text;
