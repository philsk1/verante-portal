# API Endpoints — Complete Reference

## Constraint: 12/12 Vercel Hobby slot limit

The Vercel Hobby plan allows exactly 12 serverless function files in the `/api/` directory. This project is at capacity. No new API files can be added without first consolidating two existing endpoints into one.

At 30+ tenants: upgrade to Vercel Pro (£16/month) to remove this limit.

Each file in `/api/` becomes a serverless function at the path `/api/[filename]`. For example, `/api/vapi-webhook.js` handles requests to `https://verante-portal.vercel.app/api/vapi-webhook`.

Helper files prefixed with underscore (`_build-prompt.js`, `_emails.js`, `_sms.js`, `_whatsapp-send.js`, `_zapier-webhook.js`) are imported by other functions but do NOT become HTTP endpoints themselves.

---

## Current file inventory (12/12)

| File | Route | Category |
|------|-------|----------|
| `api/admin.js` | /api/admin | Owner |
| `api/chat.js` | /api/chat | Portal Q |
| `api/export-data.js` | /api/export-data | GDPR |
| `api/freeagent.js` | /api/freeagent | Integrations |
| `api/ground-zero.js` | /api/ground-zero | Owner |
| `api/integrations.js` | /api/integrations | Integrations |
| `api/notify.js` | /api/notify | Notifications |
| `api/stripe-webhook.js` | /api/stripe-webhook | Billing |
| `api/vapi-assistant-request.js` | /api/vapi-assistant-request | Call handling |
| `api/vapi-sync.js` | /api/vapi-sync | Call handling |
| `api/vapi-webhook.js` | /api/vapi-webhook | Call handling |
| `api/xero.js` | /api/xero | Integrations |

---

## Helper modules (not HTTP endpoints)

### `api/_build-prompt.js`
Exports three functions used by both vapi-sync.js and vapi-assistant-request.js:

**`buildSystemPrompt(data)`** — Takes the full tenant data object and returns the complete system prompt string. Data object shape:
```js
{
  tenant: { ...all tenant config columns },
  services: ['service_name', ...],        // from services table
  partnerServices: ['banned_item', ...],  // from banned_services table
  callRules: [{ call_type, mode, ... }],  // from call_handling_rules table
  partners: [{ business_name, business_phone, specialties: [] }], // from referral_partners + referral_service_map
  staff: [{ name, role, specialist_services, direct_line_did, active }],
  catalogue: [{ name, description, price_from, price_to, duration_minutes, item_type }],
  isSensitive: bool,  // from business_type_subcategories.is_sensitive
}
```

**`buildGreeting(tenant, callHourUTC, isSensitive)`** — Returns the exact string Q speaks as its opening line. Used in both vapi-sync.js (for the saved assistant config) and vapi-assistant-request.js (for each live call). callHourUTC is null in vapi-sync, uses `new Date().getUTCHours()` in vapi-assistant-request for time-of-day greeting logic.

**`buildAnalysisPlan()`** — Returns the Vapi analysisPlan config object. This tells Vapi what to extract from the transcript after every call. Returns:
```js
{
  summaryPrompt: '...',           // instruction to write 1-2 sentence summary
  structuredDataPrompt: '...',    // instruction to extract fields
  structuredDataSchema: {
    type: 'object',
    properties: {
      triage_outcome: { type: 'string', enum: ['lead_captured', 'booked', 'referred_out', 'filtered', 'escalated', 'hard_close', 'spam'] },
      caller_name: { type: 'string' },
      caller_email: { type: 'string' },
      referred_to: { type: 'string' },         // partner business name if referred
      service_requested: { type: 'string' },   // main service/reason for call
      appointment_address: { type: 'string' }, // full address, exactly as stated
      appointment_datetime: { type: 'string' }, // ISO 8601 if possible
    },
    required: ['triage_outcome'],
  }
}
```

---

### `api/_emails.js`
All Resend transactional email functions. Exports:

- **`sendEmail({ to, subject, html })`** — sends a single email via Resend
- **`emailNewLead({ businessName, callerName, callerPhone, summary, outcome, callbackUrl })`** — returns `{ subject, html }` for new lead notification
- **`emailUrgentEscalation({ businessName, callerName, callerPhone, summary, callbackMins, portalUrl })`** — returns `{ subject, html }` for immediate escalation alert
- **`email80pct({ businessName, minutesUsed, includedMinutes, overagePref })`** — returns `{ subject, html }` for 80% minute usage warning
- **`emailExhausted({ businessName, includedMinutes, overagePref, tier })`** — returns `{ subject, html }` for 100% minute exhaustion alert

**Resend API key:** stored as `RESEND_API_KEY` env var.
**From address:** noreply@qerxel.com (or whichever domain is verified in Resend)

---

### `api/_sms.js`
Twilio SMS sender. Exports:

- **`sendSms({ to, message })`** — sends SMS via Twilio. Uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a from number configured in Twilio.

---

### `api/_whatsapp-send.js`
Meta Cloud API WhatsApp sender. Exports:

- **`sendWhatsApp({ tenantId, to, message })`** — fetches tenant's WhatsApp credentials from `tenant_integration_credentials`, sends message FROM the tenant's own WhatsApp Business number.

The message is sent from the client's phone_number_id using their own access_token. This means the caller receives the WhatsApp from the business's own number, not from Qerxel's number.

**Meta API call:**
```
POST https://graph.facebook.com/v19.0/{phone_number_id}/messages
Authorization: Bearer {access_token}
{
  "messaging_product": "whatsapp",
  "to": "{to}",
  "type": "text",
  "text": { "body": "{message}" }
}
```

---

### `api/_zapier-webhook.js`
Zapier webhook dispatcher. Exports:

- **`fireZapier({ tenantId, event, payload })`** — reads `tenant_integrations` for `integration_id = 'zapier'`, fires a POST to the tenant's configured Zapier webhook URL with `{ event, payload, tenantId, timestamp }`.

---

## Call handling endpoints

### `POST /api/vapi-assistant-request`
**Called by:** Vapi, automatically, before every inbound call.
**Auth:** None (Vapi fires this without auth headers; security relies on the fact that only Vapi knows this URL).

**Payload shape from Vapi:**
```json
{
  "message": {
    "type": "assistant-request",
    "call": {
      "phoneNumberId": "vapi-phone-number-uuid",
      "phoneNumber": { "number": "+441234567890" },
      "customer": { "number": "+447700900000" }
    }
  }
}
```

**Processing sequence:**
1. Extract `phoneNumberId`, `toNumber` (the Vapi number), `callerPhone` (the caller)
2. Look up tenant by `vapi_phone_number_id` → fallback to `vapi_phone_number`
3. Fetch all tenant config (8 Supabase queries in parallel) + run Twilio spam check (in parallel with tenant fetch)
4. If spam and spam_filter_enabled → return `{ error: { message: 'Call rejected.' } }`
5. Run `classifyCaller()` — 7-layer chain (supplier → partner → staff → callers table → appointments fallback → unknown)
6. If `classification.type === 'blocked'` → return `{ error: { message: 'Call rejected.' } }`
7. Build system prompt, caller context block, personalised greeting
8. Return full Vapi assistant config

**Response shape (success):**
```json
{
  "assistant": {
    "name": "Qerxel — [business_name]",
    "firstMessageMode": "assistant-speaks-first",
    "firstMessage": "[greeting string]",
    "firstMessageDelay": 1.2,
    "model": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "messages": [{ "role": "system", "content": "[full system prompt]" }],
      "temperature": 0.4
    },
    "voice": { "provider": "cartesia|deepgram", "voiceId": "...", "speed": "slow|normal|fast" },
    "analysisPlan": { "summaryPrompt": "...", "structuredDataPrompt": "...", "structuredDataSchema": {...} },
    "serverUrl": "https://verante-portal.vercel.app/api/vapi-webhook",
    "serverMessages": ["end-of-call-report"],
    "endCallFunctionEnabled": true,
    "endCallMessage": "Thanks for calling. Goodbye."
  }
}
```

**Response shape (rejection):**
```json
{ "error": { "message": "Call rejected." } }
```

**Voice config logic:**
- Standard tier: Cartesia if CARTESIA_STANDARD_VOICE_ID env var set, else Deepgram `aura-stella-en`
- Premium tier: Cartesia if CARTESIA_PREMIUM_VOICE_ID env var set, else Deepgram `aura-luna-en`
- Speed: `tenant.speech_pace` → `{ slow: 'slow', natural: 'normal', fast: 'fast' }`

---

### `POST /api/vapi-sync`
**Called by:** Frontend (AIBehaviour.jsx save button, and Onboarding.jsx on completion).
**Auth:** Requests include `tenantId` in body; service role key used server-side.

**Actions:**
- `action: 'sync'` (default when `action` not specified) — syncs tenant AI config to Vapi
- `action: 'demo-call'` — initiates a test call from the demo phone number

**Sync flow:**
1. Fetch all tenant config (8 queries in parallel, same as assistant-request)
2. Build system prompt, greeting, analysis plan
3. If `tenant.vapi_assistant_id` is null → POST to `https://api.vapi.ai/assistant` → save returned ID to `tenants.vapi_assistant_id`
4. If assistant ID exists → PATCH to `https://api.vapi.ai/assistant/{id}`

**Demo call flow:**
1. Validate `assistantId` is present — if not, return `400 { error: 'no_assistant', message: '...' }`
2. POST to `https://api.vapi.ai/call` with `{ phoneNumberId: VAPI_DEMO_PHONE_NUMBER_ID, customer: { number: phoneNumber }, assistantId }`

**Key:** `VAPI_PRIVATE_KEY` env var used as Bearer token to Vapi API.
**Demo number:** `VAPI_DEMO_PHONE_NUMBER_ID` env var — the Vapi phone number used to make outbound test calls.

---

### `POST /api/vapi-webhook`
**Called by:** Vapi, automatically, at the end of every call (end-of-call-report event).
**Auth:** None (same trust model as assistant-request).

**Payload from Vapi (end-of-call-report):**
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "assistantId": "vapi-assistant-uuid",
      "customer": { "number": "+447700900000" },
      "startedAt": 1234567890000,
      "endedAt": 1234568000000
    },
    "artifact": {
      "transcript": "Q: Good morning, Paul's Plumbing...\nCaller: Hi, I need..."
    },
    "analysis": {
      "summary": "Caller enquired about boiler service. Details taken for callback.",
      "structuredData": {
        "triage_outcome": "lead_captured",
        "caller_name": "Sarah Jones",
        "caller_email": "sarah@example.com",
        "referred_to": null,
        "service_requested": "boiler service",
        "appointment_address": "17 High Street, Wigan, WN1 1AA",
        "appointment_datetime": "2026-07-15T10:00:00"
      }
    }
  }
}
```

**Processing sequence:**
1. If event type is not `end-of-call-report` → return 200 (ignore)
2. Extract assistantId, callerNumber, duration, transcript, summary, outcome, structuredData
3. Look up tenant by `vapi_assistant_id`
4. If `outcome === 'escalated'` → fire SMS and/or email to owner immediately
5. Find or create caller record in `callers` table by phone number
6. Insert row in `call_logs` (transcript/summary nulled for sensitive businesses)
7. Fire `dispatchAfterCallMessages()` — see below (fire-and-forget)
8. If outcome is `lead_captured` or `booked` → insert `leads` row + email owner notification
9. If `sms_followup_enabled` → send SMS to caller
10. If WhatsApp integration enabled → send WhatsApp to caller
11. Fire Zapier webhook (fire-and-forget)
12. If outcome is `referred_out` → match partner by name, insert `referral_log` row
13. Run minute threshold check → fire 80%/exhausted emails if thresholds crossed
14. Check PAYG cost limit → log warning if exceeded
15. Scan transcript for opt-out phrases → update `caller_tenant_relationships` if found

**After-call messaging dispatch (`dispatchAfterCallMessages`):**
- Only fires for outcomes: `lead_captured`, `booked`, `referred_out`
- Reads messaging config from `tenant_integrations` where `integration_id = 'messaging'`
- Template variables available: `{caller_name}`, `{business_name}`, `{lead_contact_name}`, `{booking_link}`, `{service_requested}`, `{appointment_address}`, `{appointment_datetime}`
- Branch logic:
  - `lead_captured` + booking_link configured + tenant has booking URL → send `booking_link` message
  - `lead_captured` without booking URL → send `call_summary` message
  - `booked` → send `call_summary` + if address present, send `detail_confirmation`
  - `referred_out` → send `call_summary`
- Each message checks `config[typeKey].enabled` before sending
- Channel: `whatsapp` → sendWhatsApp, `sms` → sendSms, `email` → sendEmail (requires caller_email)

**Opt-out phrases detected:**
`'remove me from'`, `'take me off'`, `'stop contacting'`, `"don't contact"`, `'unsubscribe'`, `'remove my details'`, `'delete my'`, `'opt out'`, `'remove from list'`

---

## Portal Q / Chat

### `POST /api/chat`
**Called by:** VeraDialogue.jsx (in-portal Q mascot chat), support chat, booking assist.
**Auth:** Supabase session token in request.

**Actions:**
- `vera-chat` — Vera (portal Q mascot) conversation using Claude Haiku + RAG from kb_chunks
- `support-chat` — general support chat
- `booking-assist` — helps customer fill in booking form

Uses Anthropic API (Claude Haiku) via `ANTHROPIC_API_KEY`. RAG not yet fully wired (kb_chunks table not yet created). Currently uses knowledge base markdown files directly.

---

## Owner-only endpoints

### `GET /api/admin`
**Called by:** OwnerSelector.jsx.
**Auth:** Requires `ownerEmail: 'finsolsoffice@gmail.com'` in query params.

Returns all tenants with aggregate stats: appointment counts, call counts, Q scores, subscription tier, business name. Used to populate the owner selector dashboard with the 41+ tenants sorted by performance.

Uses service role key to bypass RLS and read all tenants.

---

### `POST /api/ground-zero`
**Called by:** OwnerSelector.jsx (destructive action button).
**Auth:** Requires `ownerEmail: 'finsolsoffice@gmail.com'` in request body.

Reseeds a specific demo tenant's catalogue items and appointments from sector-specific templates. Used when a demo company's data has drifted and needs to be reset to a clean, representative state.

---

## Integrations

### `POST /api/integrations`
**Called by:** Multiple pages — Integrations.jsx, BookingPage.jsx, frontend booking confirmation.

Multi-action endpoint. The `action` field in the body determines which action runs:

- `action: 'send-welcome'` — sends welcome email to new tenant
- `action: 'booking-confirm'` — sends confirmation email to customer after online booking (includes cancel_token link)
- `action: 'review-request'` — sends review request email/SMS to a completed appointment's customer
- `action: 'whatsapp-connect'` — saves WhatsApp credentials (phone_number_id + access_token) to tenant_integration_credentials
- `action: 'whatsapp-disconnect'` — removes WhatsApp integration
- `action: 'whatsapp-test'` — sends a test WhatsApp message
- `action: 'zapier-save'` — saves Zapier webhook URL to tenant_integrations
- `action: 'gcal-sync'` — Google Calendar sync (OAuth, configured but not fully active)
- `action: 'gbp-save'` — Google Business Profile config save

---

### `POST /api/freeagent`
FreeAgent and Xero accounting integrations (consolidated into one file).

- FreeAgent OAuth callback and token exchange
- Invoice creation in FreeAgent from appointment data
- Xero OAuth support

Requires `FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET` and equivalents for Xero.

---

### `POST /api/xero`
Xero OAuth endpoints (separate file).

---

## Notifications

### `POST /api/notify`
**Called by:** Make.com/n8n cron jobs, or Vercel Cron (configured in vercel.json if enabled).
**Auth:** `CRON_SECRET` in Authorization header.

Actions:
- `action: 'daily-cost'` — sends daily cost summary emails to tenants who have this enabled
- `action: 'weekly-report'` — sends weekly call summary reports
- `action: 'remind'` — fires appointment reminder messages (24h and 1h before appointments)
- `action: 'campaign'` — fires an SMS campaign to a list of callers

**Reminder flow:**
- Queries appointments where `start_time` is between now and 25 hours away AND `reminder_sent_24h = false`
- Sends reminder via SMS/WhatsApp
- Updates `reminder_sent_24h = true` on the appointment row
- Same pattern for 1h reminders with `reminder_sent_1h`

---

## Billing

### `POST /api/stripe-webhook`
**Called by:** Stripe, when billing events occur.
**Auth:** Stripe-Signature header verified against `STRIPE_WEBHOOK_SECRET`.

Events handled:
- `checkout.session.completed` — upgrades tenant tier after purchase
- `customer.subscription.updated` — updates tenant subscription tier
- `customer.subscription.deleted` — downgrades tenant to free

Updates `tenants.subscription_tier` and `tenants.calendar_tier` and `tenants.listen_tier` based on the product purchased.

---

## GDPR

### `POST /api/export-data`
**Called by:** AccountSettings.jsx.
**Auth:** Tenant must be logged in.

Exports all of a tenant's data (calls, callers, appointments, leads, etc.) as a CSV file. Used to satisfy GDPR data export requests from callers.

---

## Security model summary

- All API files use `SUPABASE_SERVICE_ROLE_KEY` — never the anon key. Service role bypasses RLS.
- Frontend uses `VITE_SUPABASE_ANON_KEY` — always respects RLS. Can never see other tenants' data.
- Vapi webhook endpoints have no auth (they must be publicly accessible for Vapi to call them).
- Owner endpoints check `ownerEmail` in request body/query — this is a lightweight check not a cryptographic one. If Vercel Hobby's serverless functions are ever publicly discoverable (they are), a determined attacker who knows the owner email could call admin.js. At scale, add a proper shared secret or JWT.
- The demo call endpoint requires the caller to pass a valid `assistantId` — this comes from `tenants.vapi_assistant_id` which only exists after a successful Vapi sync. There is no anonymous demo call path.
