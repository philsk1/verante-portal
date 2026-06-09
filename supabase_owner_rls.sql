-- Owner RLS bypass — allows finsolsoffice@gmail.com to read all tenant data
-- Run in Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- Required for owner preview mode to load any tenant's portal data.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants', 'call_logs', 'leads', 'referral_log', 'referral_partners',
    'referral_service_map', 'staff_profiles', 'catalogue_items', 'callers',
    'banned_services', 'appointments', 'tenant_integrations', 'tenant_memberships'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS owner_read_all_%s ON %I;
       CREATE POLICY owner_read_all_%s ON %I FOR SELECT
       USING (auth.jwt() ->> ''email'' = ''finsolsoffice@gmail.com'');',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
