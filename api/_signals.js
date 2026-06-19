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
import { ELEMENTS, SIGNAL_TYPES } from './_elements.js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const KNOWN_ELEMENTS     = new Set(Object.keys(ELEMENTS))
const KNOWN_SIGNAL_TYPES = new Set(Object.values(SIGNAL_TYPES))

export async function emitSignal(element, signalType, payload = {}) {
  if (!KNOWN_ELEMENTS.has(element))     console.warn(`[signal] unknown element: "${element}"`)
  if (!KNOWN_SIGNAL_TYPES.has(signalType)) console.warn(`[signal] unknown signal_type: "${signalType}"`)
  try {
    await supabase.from('system_signals').insert({ element, signal_type: signalType, payload })
  } catch (e) {
    console.error(`[signal] emit failed — ${element}/${signalType}:`, e.message)
  }
}
