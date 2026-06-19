// Master config reader — available to all elements and Q.
// READ ONLY via service_role. Write access is hard-revoked at the database
// level — no API endpoint, no tool call, no instruction can change that.
//
// The master_config table enforces three rules:
//   1. Elements report only — they cannot write to anything but system_signals
//   2. Q orchestrates but cannot touch master_config
//   3. Philip controls master_config directly via authenticated Supabase session

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULTS = {
  q_write_enabled: true,
  system_state:    'live',
  element_status:  { answer: 'active', support: 'active', q: 'active', schedule: 'active', listen: 'inactive' },
  element_authority: { answer: 'report', support: 'report', q: 'orchestrate', schedule: 'report', listen: 'report' },
}

export async function getMasterConfig() {
  try {
    const { data } = await supabase.from('master_config').select('*').eq('id', 'system').maybeSingle()
    return data || DEFAULTS
  } catch {
    return DEFAULTS
  }
}

// Is Q permitted to write right now?
export async function isQWriteEnabled() {
  const config = await getMasterConfig()
  return config.q_write_enabled === true && config.system_state !== 'emergency'
}

