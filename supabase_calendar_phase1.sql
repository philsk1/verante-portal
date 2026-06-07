-- Phase 1 calendar improvements
-- Run in Supabase SQL Editor

-- Client contact fields on appointments (enables self-manage lookup by phone)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_name  text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_email text;

-- No-show and cancellation policy enhancements on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS no_show_fee_type    text    DEFAULT 'fixed';   -- 'fixed' | 'percentage'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS no_show_fee_pct     numeric DEFAULT NULL;       -- % of service price
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS charge_late_cancel  boolean DEFAULT false;      -- apply fee on late cancel too
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS client_can_reschedule boolean DEFAULT true;     -- allow client self-reschedule
