-- Add staff_availability to owner RLS bypass
-- Run in Supabase SQL editor
-- staff_availability uses is_tenant_member join (no tenant_id column), so needs its own owner policy

DROP POLICY IF EXISTS owner_read_all_staff_availability ON staff_availability;
CREATE POLICY owner_read_all_staff_availability ON staff_availability
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'finsolsoffice@gmail.com');
