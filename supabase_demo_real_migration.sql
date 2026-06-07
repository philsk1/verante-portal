-- Demo portal real-account migration
-- Run ONCE in Supabase SQL editor before calling /api/demo-init

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
