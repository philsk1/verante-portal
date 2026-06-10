-- Migrate demo businesses into real tenant tables
-- Safe to run once. Uses temp table for ID mapping.
-- After this runs, DemoContext.jsx reads from real tables (see updated file).

BEGIN;

-- ─── 1. ID mapping ────────────────────────────────────────────────────────────
CREATE TEMP TABLE dm (
  demo_id  uuid,
  real_id  uuid DEFAULT gen_random_uuid(),
  bname    text
) ON COMMIT DROP;

INSERT INTO dm (demo_id, bname)
SELECT id, business_name FROM demo_businesses;

-- ─── 2. Tenant records ────────────────────────────────────────────────────────
INSERT INTO tenants (
  id, business_name, slug,
  subscription_tier, billing_model,
  business_phone, business_email,
  triage_mode, tone_register, business_outcome_type,
  included_minutes, calendar_tier,
  is_demo, active, data_retention_days,
  greeting_message, business_context
)
SELECT
  dm.real_id,
  db.business_name,
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(db.business_name, '[^a-zA-Z0-9 ]', '', 'g'),
        ' +', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  ) || '-demo',
  db.tier,
  'subscription',
  db.business_phone,
  db.business_email,
  db.triage_mode,
  db.tone_register,
  db.business_outcome_type,
  db.included_minutes,
  db.calendar_tier,
  true,
  true,
  90,
  db.greeting_message,
  db.business_context
FROM demo_businesses db
JOIN dm ON dm.demo_id = db.id;

-- ─── 3. Callers (unique phone numbers from demo call logs + leads) ─────────────
INSERT INTO callers (phone_number, full_name)
SELECT DISTINCT ON (phone_number) phone_number, full_name FROM (
  SELECT caller_number AS phone_number, caller_name AS full_name FROM demo_call_logs WHERE caller_number IS NOT NULL AND caller_number <> ''
  UNION ALL
  SELECT caller_number, caller_name FROM demo_leads WHERE caller_number IS NOT NULL AND caller_number <> ''
) combined
ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name;

-- ─── 4. Call logs ─────────────────────────────────────────────────────────────
INSERT INTO call_logs (
  tenant_id, caller_id, caller_phone,
  call_outcome, call_intent, ai_summary,
  duration_seconds, created_at,
  transcript, callback_flagged
)
SELECT
  dm.real_id,
  c.id,
  cl.caller_number,
  cl.call_outcome,
  cl.triage_outcome,
  cl.ai_summary,
  cl.duration_seconds,
  cl.created_at,
  cl.transcript,
  COALESCE(cl.callback_flagged, false)
FROM demo_call_logs cl
JOIN dm ON dm.demo_id = cl.business_id
LEFT JOIN callers c ON c.phone_number = cl.caller_number;

-- ─── 5. Leads ─────────────────────────────────────────────────────────────────
INSERT INTO leads (
  tenant_id, caller_name, caller_phone,
  enquiry_type, notes,
  lead_status, status,
  created_at
)
SELECT
  dm.real_id,
  l.caller_name,
  l.caller_number,
  l.enquiry_type,
  l.notes,
  l.status,
  l.status,
  l.created_at
FROM demo_leads l
JOIN dm ON dm.demo_id = l.business_id;

-- ─── 6. Referral partners ─────────────────────────────────────────────────────
INSERT INTO referral_partners (
  tenant_id, partner_name, contact_phone,
  service_type, inbound_count,
  active, partner_status
)
SELECT
  dm.real_id,
  p.partner_name,
  p.partner_phone,
  p.specialty,
  COALESCE(p.inbound_count, 0),
  true,
  'active'
FROM demo_partners p
JOIN dm ON dm.demo_id = p.business_id;

-- ─── 7. Referral log (partner_id looked up from newly inserted partners) ──────
INSERT INTO referral_log (
  tenant_id, partner_id,
  service_keyword, created_at
)
SELECT
  dm.real_id,
  rp.id,
  rl.service_requested,
  rl.created_at
FROM demo_referral_log rl
JOIN dm ON dm.demo_id = rl.business_id
LEFT JOIN referral_partners rp
  ON rp.partner_name = rl.partner_name
  AND rp.tenant_id = dm.real_id
WHERE rp.id IS NOT NULL;

-- ─── 8. Staff profiles ────────────────────────────────────────────────────────
INSERT INTO staff_profiles (
  tenant_id, name, role,
  specialist_services, phone, active,
  email, address, birthday,
  private_notes, colour, direct_line_did
)
SELECT
  dm.real_id,
  s.name,
  s.role,
  s.specialist_services,
  s.phone,
  COALESCE(s.active, true),
  s.email,
  s.address,
  s.birthday,
  s.private_notes,
  s.colour,
  s.direct_line
FROM demo_staff s
JOIN dm ON dm.demo_id = s.business_id;

-- ─── 9. Catalogue items (from demo_services) ──────────────────────────────────
INSERT INTO catalogue_items (
  tenant_id, name, item_type, active
)
SELECT
  dm.real_id,
  svc.service_name,
  CASE WHEN svc.is_partner_service THEN 'partner_service' ELSE 'service' END,
  true
FROM demo_services svc
JOIN dm ON dm.demo_id = svc.business_id;

-- ─── 10. RLS policies — allow anon (demo visitors) to read is_demo=true records
DO $$
BEGIN
  -- tenants
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='anon_read_demo_tenants') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_tenants ON tenants FOR SELECT TO anon USING (is_demo = true)';
  END IF;
  -- call_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='call_logs' AND policyname='anon_read_demo_call_logs') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_call_logs ON call_logs FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = call_logs.tenant_id AND is_demo = true))';
  END IF;
  -- leads
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='anon_read_demo_leads') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_leads ON leads FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = leads.tenant_id AND is_demo = true))';
  END IF;
  -- referral_partners
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_partners' AND policyname='anon_read_demo_partners') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_partners ON referral_partners FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = referral_partners.tenant_id AND is_demo = true))';
  END IF;
  -- referral_log
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_log' AND policyname='anon_read_demo_referral_log') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_referral_log ON referral_log FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = referral_log.tenant_id AND is_demo = true))';
  END IF;
  -- staff_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_profiles' AND policyname='anon_read_demo_staff') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_staff ON staff_profiles FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = staff_profiles.tenant_id AND is_demo = true))';
  END IF;
  -- catalogue_items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='catalogue_items' AND policyname='anon_read_demo_catalogue') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_catalogue ON catalogue_items FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = catalogue_items.tenant_id AND is_demo = true))';
  END IF;
  -- appointments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='anon_read_demo_appointments') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_appointments ON appointments FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM tenants WHERE id = appointments.tenant_id AND is_demo = true))';
  END IF;
  -- callers (needed for callers join in call_logs)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='callers' AND policyname='anon_read_demo_callers') THEN
    EXECUTE 'CREATE POLICY anon_read_demo_callers ON callers FOR SELECT TO anon USING (true)';
  END IF;
END $$;

COMMIT;
