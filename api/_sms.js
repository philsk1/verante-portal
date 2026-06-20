/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/_sms.js
 * TOPOLOGY RING : Ring 1 — Leaf (Internal Helper Module, no HTTP handler)
 * INTENT MAP    : Provides the sendSms() export used by other API files to
 *                 dispatch SMS messages via Twilio's platform-level credentials.
 *                 Not per-tenant — one Twilio account for the whole platform.
 *                 Gracefully skips (logs + returns) if env vars are absent,
 *                 so callers are never blocked by an unconfigured SMS channel.
 *                 Normalises any UK phone format to E.164 before dispatch.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : Named export — not an HTTP endpoint. Called by other API files:
 *                   sendSms({ to: string, message: string })
 *                   to      — raw UK phone number (any format: 07x, 447x, +44x)
 *                   message — SMS body text
 * EXTERNAL READS: Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *                            TWILIO_PHONE_NUMBER
 *                 Twilio REST API: POST /2010-04-01/Accounts/{sid}/Messages.json
 * MUTATIONS/DB  : NONE. No Supabase access of any kind.
 * OUTPUTS/EMITS : No return value. Errors logged to console, never thrown.
 *                 If Twilio env vars are absent, logs a warning and exits silently.
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

export async function sendSms({ to, message }) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) {
    console.warn('Twilio not configured — SMS skipped')
    return
  }

  // Normalise UK number to E.164 (+44...)
  const toE164 = to.replace(/\D/g, '').replace(/^0/, '+44').replace(/^44/, '+44')
  const toFinal = toE164.startsWith('+') ? toE164 : `+${toE164}`

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: toFinal, Body: message }).toString(),
    }
  )
  if (!resp.ok) {
    const detail = await resp.text()
    console.error('Twilio SMS failed:', detail)
  }
}
