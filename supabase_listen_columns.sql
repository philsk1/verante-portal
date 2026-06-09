-- Listen tab + notification columns migration
-- Safe to re-run (uses IF NOT EXISTS)
-- Run in Supabase SQL editor

-- Listen tab: transcript storage and callback flag
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcript       text;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS callback_flagged boolean DEFAULT false;

-- Notification preferences (from supabase_notify_columns.sql — safe to run both)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_new_lead      boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_daily_summary boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_weekly_report boolean DEFAULT true;

-- Referral programme (from supabase_referral_columns.sql — safe to run both)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code          text unique;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS credit_balance_months  integer default 0;
