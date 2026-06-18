-- Support system tables — run via Supabase SQL editor or management API
-- Creates: support_calls, support_policy, incidents, compensation_log

-- ── support_calls ─────────────────────────────────────────────────────────────
-- One row per support call. Tenant identified by matching caller phone to tenants.business_phone.

CREATE TABLE IF NOT EXISTS support_calls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid REFERENCES tenants(id) ON DELETE SET NULL,
  caller_phone          text,
  duration_seconds      integer DEFAULT 0,
  complaint_category    text CHECK (complaint_category IN ('A','B','C','D','unknown')),
  frustration_level     text CHECK (frustration_level IN ('low','medium','high','critical')),
  complaint_summary     text,
  referenced_call_log_id uuid REFERENCES call_logs(id) ON DELETE SET NULL,
  gift_given            text CHECK (gift_given IN ('none','free_minutes_10')),
  gift_rationale        text,
  strike_count          integer DEFAULT 0,
  resolution            text CHECK (resolution IN ('resolved','escalated','pending')) DEFAULT 'pending',
  requires_escalation   boolean DEFAULT false,
  transcript            text,
  ai_summary            text,
  created_at            timestamptz DEFAULT now()
);

-- ── support_policy ────────────────────────────────────────────────────────────
-- One row only. Philip's plain English instructions Q reads on every support call.

CREATE TABLE IF NOT EXISTS support_policy (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_text             text,
  free_minutes_per_call   integer DEFAULT 10,
  max_strikes             integer DEFAULT 2,
  escalation_email        text,
  escalation_whatsapp     text,
  updated_at              timestamptz DEFAULT now()
);

-- Seed the single policy row if it doesn't exist
INSERT INTO support_policy (policy_text, free_minutes_per_call, max_strikes, escalation_email, escalation_whatsapp)
SELECT
  'Q handles all support calls with warmth, patience, and honesty. Always look at the call log first. Category A failures escalate immediately. Category B complaints: explain what the client configured and offer free time to fix it together. Never make the client feel foolish — the portal is powerful and takes learning. Hold firm on where the responsibility lies, but do it kindly.',
  10,
  2,
  'finsolsoffice@gmail.com',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM support_policy);

-- ── incidents ─────────────────────────────────────────────────────────────────
-- Logged service failures. scope = 'all' means all tenants affected.

CREATE TABLE IF NOT EXISTS incidents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  description             text,
  started_at              timestamptz NOT NULL,
  ended_at                timestamptz,
  scope                   text DEFAULT 'all',
  affected_tenant_ids     uuid[],
  status                  text CHECK (status IN ('active','resolved','compensated')) DEFAULT 'active',
  compensation_rate       integer DEFAULT 10,
  total_compensation_gbp  numeric(10,2),
  created_at              timestamptz DEFAULT now()
);

-- ── compensation_log ──────────────────────────────────────────────────────────
-- Per-tenant compensation record for each incident.

CREATE TABLE IF NOT EXISTS compensation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,
  downtime_minutes integer,
  tier            text,
  compensation_gbp numeric(10,2),
  status          text CHECK (status IN ('pending','paid','credited')) DEFAULT 'pending',
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── RLS: service role bypasses (consistent with other tables) ─────────────────
ALTER TABLE support_calls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_policy    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_log  ENABLE ROW LEVEL SECURITY;

-- All read/write via service role only (API uses service role key — bypasses RLS)
-- No tenant-level RLS needed: support data is owner-only, accessed via admin.js

GRANT ALL ON support_calls     TO service_role;
GRANT ALL ON support_policy    TO service_role;
GRANT ALL ON incidents         TO service_role;
GRANT ALL ON compensation_log  TO service_role;
