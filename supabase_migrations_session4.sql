-- Qerxel — Session 4 migrations
-- Run in Supabase SQL Editor. All statements are idempotent.

-- ─── Stripe ───────────────────────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- ─── Vapi phone (pending from previous session) ───────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number text;

-- ─── Billing model + cost limit (may already exist — idempotent) ─────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_model text default 'subscription';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_cost_limit decimal default 20.00;

-- ─── Overage voice preference (may already exist — idempotent) ───────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS overage_voice_preference text default 'premium';

-- ─── Call recording ───────────────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS call_recording_enabled boolean default false;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url text;

-- ─── Phone line (build behind feature flag — VITE_PHONE_LINE_ENABLED) ─────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_line_provider text default null;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_line_status text default null;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_line_number text default null;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_line_monthly_cost decimal default 8.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_line_partner_ref text default null;

-- ─── Staff extension recognition (Enterprise) ───────────────────────────────
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS direct_line_did text default null;

-- ─── Client relationship extras (calendar / colour formula) ───────────────────
ALTER TABLE caller_tenant_relationships ADD COLUMN IF NOT EXISTS colour_formula text;
ALTER TABLE caller_tenant_relationships ADD COLUMN IF NOT EXISTS service_preferences text;
ALTER TABLE caller_tenant_relationships ADD COLUMN IF NOT EXISTS last_appointment_notes text;

-- ─── Calendar — staff availability ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references staff_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean default true
);

-- ─── Calendar — appointments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  staff_profile_id uuid references staff_profiles(id) on delete set null,
  caller_id uuid references callers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  processing_start_time timestamptz,
  processing_end_time timestamptz,
  status text default 'confirmed'
    check (status in ('provisional','confirmed','completed','cancelled','no_show')),
  appointment_type text,
  colour_formula text,
  client_notes text,
  reminder_sent_24h boolean default false,
  reminder_sent_1h boolean default false,
  created_from text default 'manual'
    check (created_from in ('manual','ai_call','lead_conversion','customer_booking')),
  created_at timestamptz default now()
);

-- ─── RLS for calendar tables ──────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Appointments: tenant members can read/write their own tenant's appointments
DROP POLICY IF EXISTS "appointments_tenant_member" ON appointments;
CREATE POLICY "appointments_tenant_member" ON appointments
  FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));

-- Staff availability: tenant members can read/write
DROP POLICY IF EXISTS "staff_availability_tenant_member" ON staff_availability;
CREATE POLICY "staff_availability_tenant_member" ON staff_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.id = staff_availability.staff_profile_id
        AND is_tenant_member(sp.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.id = staff_availability.staff_profile_id
        AND is_tenant_member(sp.tenant_id)
    )
  );

-- ─── Tenant catalogue (Enterprise — product matching) ────────────────────────
CREATE TABLE IF NOT EXISTS tenant_catalogue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  page_url text not null,
  page_title text,
  page_content text,
  category text,
  tags text[],
  last_crawled timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

ALTER TABLE tenant_catalogue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogue_tenant_member" ON tenant_catalogue;
CREATE POLICY "catalogue_tenant_member" ON tenant_catalogue
  FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));
