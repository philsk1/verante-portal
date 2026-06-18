-- Run in Supabase SQL editor BEFORE deploying the Sentry PIN build
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sentry_pin text;
