// Signal emitter — the nervous system of the element architecture.
//
// Each element calls emitSignal() to record what it observed. Signals are
// fire-and-forget: a failure here must never affect the calling element.
// Wardens read from system_signals to assess the health of each element.
//
// Usage:
//   import { emitSignal } from './_signals.js'
//   await emitSignal('answer', 'call_completed', { tenant_id, duration_seconds: 95, call_type: 'new_customer' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function emitSignal(element, signalType, payload = {}) {
  try {
    await supabase.from('system_signals').insert({ element, signal_type: signalType, payload })
  } catch (e) {
    console.error(`[signal] emit failed — ${element}/${signalType}:`, e.message)
  }
}
