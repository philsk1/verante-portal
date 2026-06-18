-- Suppliers table + catalogue_items supplier link
-- Run in Supabase SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_tenant" ON suppliers;
CREATE POLICY "suppliers_tenant" ON suppliers
  FOR ALL TO authenticated
  USING  (is_tenant_member(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));

-- Link catalogue items to suppliers
ALTER TABLE catalogue_items
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
