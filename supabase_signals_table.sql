-- system_signals: the nervous system of the element architecture.
--
-- Every element (Answer, Support, Q, Schedule, Listen) writes to this table
-- after each significant event. The warden reads from it hourly to assess
-- system health and record a snapshot.
--
-- Run this once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS system_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element     text NOT NULL,          -- 'answer' | 'support' | 'q' | 'schedule' | 'listen' | 'warden'
  signal_type text NOT NULL,          -- 'call_completed' | 'call_support_done' | 'chat_turn' | 'error' | 'warden_snapshot'
  payload     jsonb DEFAULT '{}',     -- element-specific context
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_signals_element_idx     ON system_signals (element);
CREATE INDEX IF NOT EXISTS system_signals_created_at_idx  ON system_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS system_signals_signal_type_idx ON system_signals (signal_type);

ALTER TABLE system_signals ENABLE ROW LEVEL SECURITY;

GRANT ALL ON system_signals TO service_role;
