-- ============================================================
-- Verrante RLS + FK fix
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================================


-- ── 1. Re-add the FK constraint we dropped ──────────────────
ALTER TABLE tenant_memberships
  ADD CONSTRAINT tenant_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ── 2. Enable RLS on all tables ─────────────────────────────
ALTER TABLE tenants                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE callers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caller_tenant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_partners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_service_map       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_handling_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feedback            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_services          ENABLE ROW LEVEL SECURITY;


-- ── 3. Helper: is this user a member of this tenant? ────────
-- Used by other policies. Created once, referenced everywhere.
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


-- ── 4. tenants ───────────────────────────────────────────────
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (is_tenant_member(id));

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (is_tenant_member(id));


-- ── 5. tenant_memberships ────────────────────────────────────
CREATE POLICY "memberships_select" ON tenant_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "memberships_insert" ON tenant_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());


-- ── 6. services ─────────────────────────────────────────────
CREATE POLICY "services_select" ON services
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "services_insert" ON services
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "services_update" ON services
  FOR UPDATE USING (is_tenant_member(tenant_id));

CREATE POLICY "services_delete" ON services
  FOR DELETE USING (is_tenant_member(tenant_id));


-- ── 7. banned_services ──────────────────────────────────────
CREATE POLICY "banned_services_select" ON banned_services
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "banned_services_insert" ON banned_services
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "banned_services_delete" ON banned_services
  FOR DELETE USING (is_tenant_member(tenant_id));


-- ── 8. call_logs ────────────────────────────────────────────
CREATE POLICY "call_logs_select" ON call_logs
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "call_logs_insert" ON call_logs
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));


-- ── 9. leads ────────────────────────────────────────────────
CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (is_tenant_member(tenant_id));


-- ── 10. callers ─────────────────────────────────────────────
-- Callers are global phone records — readable if linked to your tenant
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


-- ── 11. caller_tenant_relationships ─────────────────────────
CREATE POLICY "ctr_select" ON caller_tenant_relationships
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "ctr_insert" ON caller_tenant_relationships
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "ctr_delete" ON caller_tenant_relationships
  FOR DELETE USING (is_tenant_member(tenant_id));


-- ── 12. staff_profiles ──────────────────────────────────────
CREATE POLICY "staff_select" ON staff_profiles
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "staff_insert" ON staff_profiles
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "staff_update" ON staff_profiles
  FOR UPDATE USING (is_tenant_member(tenant_id));

CREATE POLICY "staff_delete" ON staff_profiles
  FOR DELETE USING (is_tenant_member(tenant_id));


-- ── 13. referral_partners ───────────────────────────────────
CREATE POLICY "partners_select" ON referral_partners
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "partners_insert" ON referral_partners
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "partners_update" ON referral_partners
  FOR UPDATE USING (is_tenant_member(tenant_id));

CREATE POLICY "partners_delete" ON referral_partners
  FOR DELETE USING (is_tenant_member(tenant_id));


-- ── 14. referral_service_map ────────────────────────────────
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


-- ── 15. referral_log ────────────────────────────────────────
CREATE POLICY "ref_log_select" ON referral_log
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "ref_log_insert" ON referral_log
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));


-- ── 16. call_handling_rules ─────────────────────────────────
CREATE POLICY "rules_select" ON call_handling_rules
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "rules_insert" ON call_handling_rules
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "rules_update" ON call_handling_rules
  FOR UPDATE USING (is_tenant_member(tenant_id));

CREATE POLICY "rules_upsert" ON call_handling_rules
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));


-- ── 17. tenant_feedback ─────────────────────────────────────
CREATE POLICY "feedback_select" ON tenant_feedback
  FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "feedback_insert" ON tenant_feedback
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));


-- ── 18. Reference tables — authenticated read only ──────────
CREATE POLICY "biz_cats_select" ON business_type_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "biz_subs_select" ON business_type_subcategories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "template_services_select" ON template_services
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ── Done ─────────────────────────────────────────────────────
-- Every tenant's data is now isolated. The Vapi service worker
-- will need the service_role key (not anon) to insert call_logs
-- and leads — set that up when wiring the AI backend.
