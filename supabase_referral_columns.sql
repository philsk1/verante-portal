-- Add referral program columns to tenants table
-- Safe to re-run (uses IF NOT EXISTS)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code text unique;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS credit_balance_months integer default 0;
