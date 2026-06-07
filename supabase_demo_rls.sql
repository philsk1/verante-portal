-- Demo tables RLS policies
-- Allow anon/public SELECT on all demo_ tables (read-only demo data, no sensitive info)

CREATE POLICY IF NOT EXISTS "Public read demo_users"
  ON demo_users FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_businesses"
  ON demo_businesses FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_call_logs"
  ON demo_call_logs FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_leads"
  ON demo_leads FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_referral_log"
  ON demo_referral_log FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_services"
  ON demo_services FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_staff"
  ON demo_staff FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_partners"
  ON demo_partners FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_pricing_intelligence"
  ON demo_pricing_intelligence FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read demo_competitor_intelligence"
  ON demo_competitor_intelligence FOR SELECT USING (true);

-- Allow anon INSERT on demo_sessions so portal can track demo visits
CREATE POLICY IF NOT EXISTS "Public insert demo_sessions"
  ON demo_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public read demo_sessions"
  ON demo_sessions FOR SELECT USING (true);
