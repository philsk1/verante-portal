-- Upgrade demo tenants with multiple staff to calendar_tier = 'multi'
-- Run in Supabase SQL editor
-- Only updates tenants that have >1 staff profile and are currently on 'entry'

UPDATE tenants
SET calendar_tier = 'multi'
WHERE calendar_tier = 'entry'
  AND (
    SELECT COUNT(*) FROM staff_profiles WHERE staff_profiles.tenant_id = tenants.id
  ) > 1;

-- Verify: show affected tenants
SELECT business_name, calendar_tier,
  (SELECT COUNT(*) FROM staff_profiles WHERE staff_profiles.tenant_id = tenants.id) AS staff_count
FROM tenants
WHERE calendar_tier = 'multi'
ORDER BY business_name;
