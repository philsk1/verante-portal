-- Add notification preference columns to tenants table
-- Safe to re-run (uses IF NOT EXISTS)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_new_lead boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_daily_summary boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notify_weekly_report boolean DEFAULT true;
