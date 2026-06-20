/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/_signals.js
 * TOPOLOGY RING : Ring 1 — Leaf (Internal Helper Module, no HTTP handler)
 * INTENT MAP    : Provides the emitSignal() export used by all other API
 *                 elements to record observations into system_signals. This is
 *                 the nervous system write-sink of the element architecture.
 *                 Fire-and-forget: errors are caught internally and never
 *                 propagated to the caller. Wardens read system_signals to
 *                 assess per-element health. Never reads signals back — pure
 *                 write sink only.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : Named export — not an HTTP endpoint. Called by other API files:
 *                   emitSignal(element: string, signalType: string, payload?: object)
 *                   element    — must be a key in ELEMENTS registry (_elements.js)
 *                   signalType — must be a value in SIGNAL_TYPES registry (_elements.js)
 *                   payload    — arbitrary metadata object (default: {})
 * EXTERNAL READS: _elements.js → ELEMENTS (key validation set),
 *                                 SIGNAL_TYPES (value validation set)
 *                 Env vars: SUPABASE_SERVICE_ROLE_KEY,
 *                           SUPABASE_URL (falls back to hardcoded project URL)
 * MUTATIONS/DB  : system_signals table — INSERT one row per call:
 *                   { element, signal_type: signalType, payload }
 *                   INSERT errors are swallowed — failure never throws to caller.
 * OUTPUTS/EMITS : No return value. Errors logged to console only, never re-thrown.
 *
 * ─── IN-FILE PRIME DIRECTIVES (MANDATORY) ────────────────────────────────────
 * 1. Never create new files to house extracted logic. Keep it in this file.
 * 2. Run a regression map before every single future edit.
 * 3. No CSS, no CSS variables, inline styles only if layout is touched.
 * 4. Every database mutation must keep its save guard (if applicable).
 * 5. Clean Slate Rule: If complex nesting or multi-path drift occurs,
 *    the engineer must rebuild this module from a blank canvas. No patching.
 * ============================================================================
 */

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
