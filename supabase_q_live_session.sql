-- Q Live Session — columns to support Q navigating the portal during support calls
-- Run in Supabase SQL editor

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS q_session_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS q_session_tab text,
  ADD COLUMN IF NOT EXISTS q_session_highlight text[],
  ADD COLUMN IF NOT EXISTS q_draft_instructions text;

-- Enable Realtime for tenants table so portal updates live when Q writes
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
