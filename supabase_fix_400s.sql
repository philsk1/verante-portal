-- =====================================================================
-- Fix 400 errors in regular portal queries
-- Safe to re-run (IF NOT EXISTS / DO blocks)
-- Run in Supabase SQL Editor
-- =====================================================================

-- 1. triage_mode missing from tenants
--    (ActivityDashboard and AIBehaviour both select it)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS triage_mode text DEFAULT 'balanced';

-- 2. notes + ai_summary missing from leads
--    (ActivityDashboard lead modal allows editing notes; ai_summary
--     will be populated when we wire it from the call's ai_summary)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes      text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary text;

-- 3. FK: leads.caller_id → callers(id)
--    Without this FK PostgREST cannot do callers(phone_number) join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_caller_id_fkey'
      AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_caller_id_fkey
      FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. FK: call_logs.caller_id → callers(id)
--    Without this PostgREST cannot do callers(phone_number, full_name) join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'call_logs_caller_id_fkey'
      AND table_name = 'call_logs'
  ) THEN
    ALTER TABLE call_logs
      ADD CONSTRAINT call_logs_caller_id_fkey
      FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. FK: referral_log.partner_id → referral_partners(id)
--    Without this PostgREST cannot do referral_partners(business_name) join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'referral_log_partner_id_fkey'
      AND table_name = 'referral_log'
  ) THEN
    ALTER TABLE referral_log
      ADD CONSTRAINT referral_log_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES referral_partners(id) ON DELETE SET NULL;
  END IF;
END $$;
