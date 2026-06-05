-- Verrante — Integrations schema
-- Run in Supabase SQL Editor. All statements are idempotent.
-- Link: supabase_migrations_integrations.sql

-- ─── Integration settings (readable by tenant members) ───────────────────────
-- Stores non-sensitive config: enabled state, template text, preferences.
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  integration_id text not null,
  -- e.g. 'whatsapp', 'freeagent', 'xero', 'google_calendar', 'google_business'
  enabled boolean default true,
  settings jsonb default '{}',
  -- non-sensitive: message templates, preferences, display names
  connected_at timestamptz default now(),
  unique(tenant_id, integration_id)
);

ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations_read" ON tenant_integrations;
CREATE POLICY "integrations_read" ON tenant_integrations
  FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "integrations_write" ON tenant_integrations;
CREATE POLICY "integrations_write" ON tenant_integrations
  FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));

-- ─── Integration credentials (service role only — never exposed to frontend) ──
-- Stores OAuth tokens, API keys, phone number IDs. No RLS for authenticated role.
CREATE TABLE IF NOT EXISTS tenant_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  integration_id text not null,
  credentials jsonb default '{}',
  -- whatsapp: { phone_number_id, access_token }
  -- freeagent: { access_token, refresh_token, expires_at, company_url }
  -- xero: { access_token, refresh_token, tenant_id, expires_at }
  -- google_calendar: { access_token, refresh_token, calendar_id }
  updated_at timestamptz default now(),
  unique(tenant_id, integration_id)
);

-- No authenticated RLS — service role only. Correct.
ALTER TABLE tenant_integration_credentials ENABLE ROW LEVEL SECURITY;
-- (No CREATE POLICY — authenticated users cannot access this table at all)
