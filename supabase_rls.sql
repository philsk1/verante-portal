-- ============================================================
-- Qerxel RLS — idempotent enable script
-- Safe to run multiple times. Paste into Supabase SQL Editor.
-- Updated: 2026-06-04 — added vera_speeches, vera_seen,
--   tenant_credits, minute_usage; made all drops idempotent.
-- ============================================================


-- ── 1. FK constraint (idempotent) ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_memberships_user_id_fkey'
  ) THEN
    ALTER TABLE tenant_memberships
      ADD CONSTRAINT tenant_memberships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ── 2. Enable RLS on all tables ─────────────────────────────
ALTER TABLE tenants                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_services              ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE callers                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE caller_tenant_relationships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_partners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_service_map         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_handling_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feedback              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_subcategories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_speeches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vera_seen                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_credits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE minute_usage                 ENABLE ROW LEVEL SECURITY;


-- ── 3. Helper function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION is_tenant_member(tid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = tid AND user_id = auth.uid()
  );
$$;


-- ── 4. Drop all existing policies (clean slate) ──────────────
DROP POLICY IF EXISTS "tenants_select"            ON tenants;
DROP POLICY IF EXISTS "tenants_insert"            ON tenants;
DROP POLICY IF EXISTS "tenants_update"            ON tenants;

DROP POLICY IF EXISTS "memberships_select"        ON tenant_memberships;
DROP POLICY IF EXISTS "memberships_insert"        ON tenant_memberships;

DROP POLICY IF EXISTS "services_select"           ON services;
DROP POLICY IF EXISTS "services_insert"           ON services;
DROP POLICY IF EXISTS "services_update"           ON services;
DROP POLICY IF EXISTS "services_delete"           ON services;

DROP POLICY IF EXISTS "banned_services_select"    ON banned_services;
DROP POLICY IF EXISTS "banned_services_insert"    ON banned_services;
DROP POLICY IF EXISTS "banned_services_delete"    ON banned_services;

DROP POLICY IF EXISTS "call_logs_select"          ON call_logs;
DROP POLICY IF EXISTS "call_logs_insert"          ON call_logs;

DROP POLICY IF EXISTS "leads_select"              ON leads;
DROP POLICY IF EXISTS "leads_insert"              ON leads;
DROP POLICY IF EXISTS "leads_update"              ON leads;

DROP POLICY IF EXISTS "callers_select"            ON callers;
DROP POLICY IF EXISTS "callers_insert"            ON callers;
DROP POLICY IF EXISTS "callers_update"            ON callers;

DROP POLICY IF EXISTS "ctr_select"                ON caller_tenant_relationships;
DROP POLICY IF EXISTS "ctr_insert"                ON caller_tenant_relationships;
DROP POLICY IF EXISTS "ctr_delete"                ON caller_tenant_relationships;

DROP POLICY IF EXISTS "staff_select"              ON staff_profiles;
DROP POLICY IF EXISTS "staff_insert"              ON staff_profiles;
DROP POLICY IF EXISTS "staff_update"              ON staff_profiles;
DROP POLICY IF EXISTS "staff_delete"              ON staff_profiles;

DROP POLICY IF EXISTS "partners_select"           ON referral_partners;
DROP POLICY IF EXISTS "partners_insert"           ON referral_partners;
DROP POLICY IF EXISTS "partners_update"           ON referral_partners;
DROP POLICY IF EXISTS "partners_delete"           ON referral_partners;

DROP POLICY IF EXISTS "ref_map_select"            ON referral_service_map;
DROP POLICY IF EXISTS "ref_map_insert"            ON referral_service_map;
DROP POLICY IF EXISTS "ref_map_delete"            ON referral_service_map;

DROP POLICY IF EXISTS "ref_log_select"            ON referral_log;
DROP POLICY IF EXISTS "ref_log_insert"            ON referral_log;

DROP POLICY IF EXISTS "rules_select"              ON call_handling_rules;
DROP POLICY IF EXISTS "rules_insert"              ON call_handling_rules;
DROP POLICY IF EXISTS "rules_update"              ON call_handling_rules;
DROP POLICY IF EXISTS "rules_upsert"              ON call_handling_rules;

DROP POLICY IF EXISTS "feedback_select"           ON tenant_feedback;
DROP POLICY IF EXISTS "feedback_insert"           ON tenant_feedback;

DROP POLICY IF EXISTS "biz_cats_select"           ON business_type_categories;
DROP POLICY IF EXISTS "biz_subs_select"           ON business_type_subcategories;
DROP POLICY IF EXISTS "template_services_select"  ON template_services;

DROP POLICY IF EXISTS "vera_speeches_select"      ON vera_speeches;
DROP POLICY IF EXISTS "vera_seen_select"          ON vera_seen;
DROP POLICY IF EXISTS "vera_seen_insert"          ON vera_seen;

DROP POLICY IF EXISTS "credits_select"            ON tenant_credits;
DROP POLICY IF EXISTS "minute_usage_select"       ON minute_usage;


-- ── 5. Policies ──────────────────────────────────────────────

-- tenants
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (is_tenant_member(id));
CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (is_tenant_member(id));

-- tenant_memberships
CREATE POLICY "memberships_select" ON tenant_memberships
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "memberships_insert" ON tenant_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- services
CREATE POLICY "services_select" ON services
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "services_insert" ON services
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "services_update" ON services
  FOR UPDATE USING (is_tenant_member(tenant_id));
CREATE POLICY "services_delete" ON services
  FOR DELETE USING (is_tenant_member(tenant_id));

-- banned_services
CREATE POLICY "banned_services_select" ON banned_services
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "banned_services_insert" ON banned_services
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "banned_services_delete" ON banned_services
  FOR DELETE USING (is_tenant_member(tenant_id));

-- call_logs
CREATE POLICY "call_logs_select" ON call_logs
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "call_logs_insert" ON call_logs
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- leads
CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (is_tenant_member(tenant_id));

-- callers (global phone book — visible only if linked to your tenant)
CREATE POLICY "callers_select" ON callers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caller_tenant_relationships ctr
      JOIN tenant_memberships tm ON tm.tenant_id = ctr.tenant_id
      WHERE ctr.caller_id = callers.id AND tm.user_id = auth.uid()
    )
  );
CREATE POLICY "callers_insert" ON callers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "callers_update" ON callers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM caller_tenant_relationships ctr
      JOIN tenant_memberships tm ON tm.tenant_id = ctr.tenant_id
      WHERE ctr.caller_id = callers.id AND tm.user_id = auth.uid()
    )
  );

-- caller_tenant_relationships
CREATE POLICY "ctr_select" ON caller_tenant_relationships
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "ctr_insert" ON caller_tenant_relationships
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "ctr_delete" ON caller_tenant_relationships
  FOR DELETE USING (is_tenant_member(tenant_id));

-- staff_profiles
CREATE POLICY "staff_select" ON staff_profiles
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "staff_insert" ON staff_profiles
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "staff_update" ON staff_profiles
  FOR UPDATE USING (is_tenant_member(tenant_id));
CREATE POLICY "staff_delete" ON staff_profiles
  FOR DELETE USING (is_tenant_member(tenant_id));

-- referral_partners
CREATE POLICY "partners_select" ON referral_partners
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "partners_insert" ON referral_partners
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "partners_update" ON referral_partners
  FOR UPDATE USING (is_tenant_member(tenant_id));
CREATE POLICY "partners_delete" ON referral_partners
  FOR DELETE USING (is_tenant_member(tenant_id));

-- referral_service_map (no direct tenant_id — joins via referral_partners)
CREATE POLICY "ref_map_select" ON referral_service_map
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM referral_partners rp
      JOIN tenant_memberships tm ON tm.tenant_id = rp.tenant_id
      WHERE rp.id = referral_service_map.partner_id AND tm.user_id = auth.uid()
    )
  );
CREATE POLICY "ref_map_insert" ON referral_service_map
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM referral_partners rp
      JOIN tenant_memberships tm ON tm.tenant_id = rp.tenant_id
      WHERE rp.id = referral_service_map.partner_id AND tm.user_id = auth.uid()
    )
  );
CREATE POLICY "ref_map_delete" ON referral_service_map
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM referral_partners rp
      JOIN tenant_memberships tm ON tm.tenant_id = rp.tenant_id
      WHERE rp.id = referral_service_map.partner_id AND tm.user_id = auth.uid()
    )
  );

-- referral_log
CREATE POLICY "ref_log_select" ON referral_log
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "ref_log_insert" ON referral_log
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- call_handling_rules
CREATE POLICY "rules_select" ON call_handling_rules
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "rules_insert" ON call_handling_rules
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY "rules_update" ON call_handling_rules
  FOR UPDATE USING (is_tenant_member(tenant_id));

-- tenant_feedback
CREATE POLICY "feedback_select" ON tenant_feedback
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "feedback_insert" ON tenant_feedback
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- reference tables — any authenticated user can read
CREATE POLICY "biz_cats_select" ON business_type_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "biz_subs_select" ON business_type_subcategories
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "template_services_select" ON template_services
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- vera_speeches — global speech content, any authenticated user can read
CREATE POLICY "vera_speeches_select" ON vera_speeches
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- vera_seen — per tenant, tracks which speeches this tenant has seen
CREATE POLICY "vera_seen_select" ON vera_seen
  FOR SELECT USING (is_tenant_member(tenant_id));
CREATE POLICY "vera_seen_insert" ON vera_seen
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- tenant_credits — frontend reads only; service_role key writes (Vapi webhook)
CREATE POLICY "credits_select" ON tenant_credits
  FOR SELECT USING (is_tenant_member(tenant_id));

-- minute_usage — frontend reads only; service_role key writes (Vapi webhook)
CREATE POLICY "minute_usage_select" ON minute_usage
  FOR SELECT USING (is_tenant_member(tenant_id));


-- ── Done ─────────────────────────────────────────────────────
-- Vapi webhook uses service_role key — bypasses RLS on all inserts.
-- Frontend uses HS256 anon key with auth.uid() — fully scoped to tenant.
-- DO NOT switch to the sb_publishable_ ES256 key — auth.uid() breaks.
