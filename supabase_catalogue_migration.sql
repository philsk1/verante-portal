-- Qerxel Catalogue Items — run in Supabase SQL Editor
-- Safe to re-run (idempotent)

CREATE TABLE IF NOT EXISTS catalogue_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        REFERENCES tenants(id) ON DELETE CASCADE,
  item_type           text        NOT NULL DEFAULT 'service', -- 'service' | 'product'
  name                text        NOT NULL,
  description         text,
  price_from          numeric,
  price_to            numeric,
  duration_minutes    integer,    -- appointment chair time
  processing_minutes  integer,    -- split-appointment processing gap (e.g. hair colour, dental X-ray)
  category            text,
  sku                 text,       -- product code / SKU
  active              boolean     DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogue_items_tenant" ON catalogue_items;
CREATE POLICY "catalogue_items_tenant" ON catalogue_items
  FOR ALL TO authenticated
  USING  (is_tenant_member(tenant_id))
  WITH CHECK (is_tenant_member(tenant_id));
