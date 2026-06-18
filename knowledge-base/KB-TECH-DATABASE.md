# Database Schema — Complete Reference

## Connection details

**Provider:** Supabase (PostgreSQL 15)
**Project ID:** kkrsvkxkefijmtbwykzv
**URL:** https://kkrsvkxkefijmtbwykzv.supabase.co
**Region:** EU West (London) — data never leaves EU
**Auth:** Supabase Auth (built-in)

**Client instantiation in API files (service role — bypasses RLS):**
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

**Client instantiation in frontend (anon key — respects RLS):**
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Row Level Security (RLS) is enabled on ALL tables. Tenants can only access rows where `tenant_id = auth.uid()` (or more precisely, where they are a member of the tenant via `tenant_memberships`). The RLS function `is_tenant_member(tenant_id)` checks this.

The owner (finsolsoffice@gmail.com) has a bypass policy applied via `supabase_owner_rls.sql` that grants SELECT on all tables. This is what allows the OwnerSelector and admin.js to read all tenants' data.

---

## Critical runtime constraints — violations cause errors

1. `appointments.status` must be one of: `provisional`, `confirmed`, `completed`, `cancelled`, `no_show`. The value `scheduled` does NOT exist in this system and will pass Postgres silently but break all filters.
2. `appointments.title` is NOT NULL. Always set it as `"${service} — ${client_name}"`.
3. `staff_profiles.colour` is British English spelling. The column is NOT `color`.
4. `staff_availability` has NO `tenant_id` column. It is linked to tenants only via `staff_profile_id → staff_profiles.tenant_id`.
5. Always use `.maybeSingle()` not `.single()`. `.single()` throws HTTP 406 when 0 rows are returned.
6. `callers.full_name` — the column is `full_name`, NOT `name`.
7. `vera_speeches` — the column is `context_key`, NOT `speech_key`.
8. `catalogue_items.price_from` and `catalogue_items.price_to` — NOT `price`. Prices are a range, not a single value.

---

## Core tables

### `tenants`
One row per business. Everything that makes a tenant unique is in this table or referenced from it.

```sql
id                          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
business_name               text
business_phone              text    -- owner's real phone, used for SMS escalation alerts
business_email              text    -- owner's email, used for notifications
business_address            text
vapi_phone_number           text    -- E.164 phone number provisioned in Vapi (e.g. +441234567890)
vapi_phone_number_id        text    -- Vapi's internal UUID for the phone number — used to identify tenant on inbound calls
vapi_assistant_id           text    -- Vapi's internal UUID for the tenant's AI assistant
subscription_tier           text    -- 'free'|'light'|'standard'|'professional'|'enterprise'|'bespoke'|'schedule_only'
calendar_tier               text    -- 'none'|'entry'|'multi'
listen_tier                 text    -- 'none'|'standard'
sentry_camera_limit         integer DEFAULT 0  -- 0 = Sentry inactive
sentry_pin                  text    -- 4-digit PIN for Sentry access, nullable

-- AI behaviour config
triage_mode                 text    -- 'balanced'|'thorough'|'lean'
tone_register               text    -- 'warm'|'formal'
business_outcome_type       text    -- 'booking'|'quote'|'custom'
custom_outcome_text         text    -- used when business_outcome_type = 'custom'
greeting_message            text    -- optional addendum to standard Q greeting (NOT the full greeting)
additional_instructions     text    -- free text injected at end of system prompt
emergency_keywords          text[]  -- triggers immediate escalation
keep_alive_topics           text[]  DEFAULT ARRAY['appointment booking','product enquiry','senior citizen']
keep_alive_max_minutes      integer DEFAULT 5
spam_filter_enabled         bool    DEFAULT true
sales_call_handling         bool    DEFAULT true
autodialler_detection       bool    DEFAULT true
blocked_phone_numbers       text[]  -- E.164 or local format numbers to reject
escalation_preference       text    -- 'escalate'|'message'
urgent_escalation_method    text    -- 'sms'|'email'|null (null = both)
urgent_callback_mins        integer DEFAULT 60
speech_style                text    -- 'warm'|'balanced'|'direct'
speech_pace                 text    -- 'slow'|'natural'|'fast'
response_delay_seconds      numeric DEFAULT 1.2
overage_voice_preference    text    -- 'standard'|'premium' — controls TTS provider
provisional_booking_enabled bool    DEFAULT false
provisional_booking_rule    text    -- plain English rule for when Q can offer a slot
booking_slots_to_offer      integer DEFAULT 2
booking_buffer_mins         integer DEFAULT 30
booking_confirmation_window_mins integer DEFAULT 120
callback_preference_note    text    -- e.g. "within two hours on working days"
lead_contact_name           text    -- name Q uses for callbacks and messages
subcategory_id              uuid    FK → business_type_subcategories

-- Notification preferences
notify_new_lead             bool    DEFAULT true
notify_daily_summary        bool    DEFAULT false
notify_weekly_report        bool    DEFAULT true
notify_80pct_sent_month     text    -- '2026-06' format — prevents duplicate monthly alerts
notify_exhausted_sent_month text    -- same pattern

-- Billing and usage
billing_model               text    -- 'subscription'|'payg'
included_minutes            integer -- call minutes included in subscription tier
monthly_cost_limit          numeric -- PAYG spend cap
sms_followup_enabled        bool    DEFAULT false
sms_followup_message        text    -- custom SMS template, nullable
booking_link                text    -- tenant's external booking page URL

-- Booking page branding
brand_colour                varchar(7)   -- hex colour code for booking page accent
logo_url                    text         -- hosted logo URL
booking_promo_text          text         -- 160 char max promotional banner
booking_promo_expires_at    timestamptz
hide_qerxel_ad              bool DEFAULT false  -- professional+ only: removes discovery card (NOT footer)

-- Q mascot behaviour
q_mode                      text    -- 'very_helpful'|'jump_in'|'mind_own_business'
q_dismissals                jsonb   DEFAULT '{}'  -- per-page dismissal timestamps {"ai": "2026-06-13T..."}

-- UI state
feedback_prompt_shown       bool    DEFAULT false

-- Calendar booking settings
cancel_cutoff_hrs           integer
client_can_reschedule       bool    DEFAULT true
charge_late_cancel          bool    DEFAULT false
no_show_fee                 bool    DEFAULT false
no_show_fee_type            text    -- 'fixed'|'percentage'
no_show_fee_pct             numeric

created_at                  timestamptz DEFAULT now()
```

**Derived product flags (computed in frontend, never stored):**
```js
const hasSchedule      = calendarTier !== 'none'
const hasScheduleMulti = calendarTier === 'multi'
const hasListen        = listenTier !== 'none'
const hasAnswerProduct = !!subscriptionTier && subscriptionTier !== 'schedule_only'
```

---

### `tenant_memberships`
Links Supabase auth users to tenants. A user can in theory be a member of multiple tenants, but currently each user maps to exactly one tenant.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid    NOT NULL    REFERENCES auth.users
tenant_id   uuid    NOT NULL    REFERENCES tenants
created_at  timestamptz DEFAULT now()
```

**Standard pattern to resolve tenantId from logged-in user:**
```js
const { data: membership } = await supabase
  .from('tenant_memberships')
  .select('tenant_id')
  .eq('user_id', user.id)
  .maybeSingle()
const tenantId = membership?.tenant_id
```

---

## Schedule tables

### `appointments`
All bookings — whether created by Q on a call, by a customer via the booking page, or manually by the tenant in the calendar.

```sql
id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid        NOT NULL REFERENCES tenants
staff_profile_id    uuid        REFERENCES staff_profiles  -- nullable, which team member
service_id          uuid        REFERENCES catalogue_items  -- nullable, which service
title               text        NOT NULL  -- always set: "${service} — ${client_name}"
appointment_type    text        -- service name string (denormalised for display)
client_name         text
client_phone        text        -- E.164 or local format — used for caller intelligence matching
client_email        text
client_notes        text        -- notes from the customer at booking time
start_time          timestamptz NOT NULL
end_time            timestamptz NOT NULL
processing_end_time timestamptz -- nullable: for services with processing_minutes (e.g. dye processing)
status              text        -- 'provisional'|'confirmed'|'completed'|'cancelled'|'no_show'
                                -- ⚠️ NOT 'scheduled' — this value does not exist in this system
created_from        text        -- 'manual'|'customer_booking'
cancel_token        uuid        DEFAULT gen_random_uuid()  -- token for /manage-booking/:token URLs
reminder_sent_24h   bool        DEFAULT false
reminder_sent_1h    bool        DEFAULT false
description         text        -- additional notes from staff
created_at          timestamptz DEFAULT now()
```

**Why client_phone matters for caller intelligence:** The classifyCaller function in vapi-assistant-request.js checks `appointments.client_phone` directly when a caller is not found in the callers table. This catches anyone who booked online but was never added to the callers table. It also enables "who called and who booked" analysis.

---

### `staff_profiles`
One row per team member. Used by both the calendar (staff availability, appointment assignment) and Q's system prompt (direct line routing, specialism mentions).

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid    NOT NULL REFERENCES tenants
name                text    NOT NULL
role                text    -- 'Owner'|'Manager'|'Technician'|custom
colour              varchar(7)  -- ⚠️ British spelling. NOT 'color'. Hex code for calendar display.
bio                 text
phone               text    -- direct mobile, used for caller classification
direct_line_did     text    -- DID number if staff have their own direct lines
specialist_services text[]  -- services this staff member specialises in
tags                text[]  -- free tags for filtering
active              bool    DEFAULT true
created_at          timestamptz DEFAULT now()
```

---

### `staff_availability`
⚠️ Has NO `tenant_id` column. Linked to tenant only via `staff_profiles.tenant_id`.

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
staff_profile_id    uuid    NOT NULL REFERENCES staff_profiles
day_of_week         integer NOT NULL  -- 0=Sunday, 1=Monday, ... 6=Saturday
start_time          time    NOT NULL  -- e.g. '09:00'
end_time            time    NOT NULL  -- e.g. '17:00'
active              bool    DEFAULT true
```

**Query pattern — must go via staff IDs:**
```js
const { data: staffIds } = await supabase
  .from('staff_profiles')
  .select('id')
  .eq('tenant_id', tenantId)

const ids = (staffIds || []).map(s => s.id)

const { data: availability } = await supabase
  .from('staff_availability')
  .select('*')
  .in('staff_profile_id', ids)
```

---

### `catalogue_items`
Services and products. Shared between Answer (AI reads this for service knowledge) and Schedule (booking page service selection, calendar). Active items are injected into Q's system prompt.

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid    NOT NULL REFERENCES tenants
name                text    NOT NULL
description         text
item_type           text    -- 'service'|'product'
category            text    -- grouping label for UI display
price_from          numeric -- ⚠️ NOT 'price'. Range minimum.
price_to            numeric -- ⚠️ NOT 'price'. Range maximum. Can equal price_from for fixed price.
duration_minutes    integer -- used by calendar for slot calculation
processing_minutes  integer -- nullable: extra time after service (e.g. dye processing, no new bookings)
active              bool    DEFAULT true
internal_notes      text    -- owner-visible only — NOT read by AI
supplier_id         uuid    REFERENCES suppliers  -- nullable: which supplier provides this
product_url         text    -- checkout/info page URL, used by Listen Pro hand-off
created_at          timestamptz DEFAULT now()
```

**Pricing rule in Q's prompt:** When `business_outcome_type = 'quote'`, Q is instructed to follow every price mention with "That's a rough guide — [business_name] would need to see the job to give you an accurate quote." This prevents Q from committing to prices the owner hasn't agreed to.

---

### `suppliers`
Supplier directory. Each supplier can be linked to catalogue items (who supplies what). Generates one-click order mailto: links in Business Desk.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id   uuid    NOT NULL REFERENCES tenants
name        text    NOT NULL
email       text
phone       text    -- also checked in caller classification Layer 3
notes       text    -- account number, rep name, order notes
created_at  timestamptz DEFAULT now()
```

---

### `services`
Simple service list (legacy, predates `catalogue_items`). Q uses `catalogue_items` preferentially. These are used as a fallback if no catalogue items exist.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
service_name    text    NOT NULL
created_at      timestamptz DEFAULT now()
```

---

## Answer (call handling) tables

### `call_logs`
One row per handled call.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
caller_id       uuid    REFERENCES callers  -- nullable if caller is anonymous
caller_phone    text    -- raw E.164 number from Vapi
duration_seconds integer
transcript      text    -- full verbatim transcript from Vapi (null for sensitive business types)
ai_summary      text    -- 1-2 sentence summary from Vapi analysis (null for sensitive)
call_outcome    text    -- 'lead_captured'|'booked'|'referred_out'|'filtered'|'escalated'|'hard_close'|'spam'
created_at      timestamptz DEFAULT now()
```

**Note:** `call_outcome` is set from `analysis.structuredData.triage_outcome` in the Vapi end-of-call-report payload. The field is named `call_outcome` in the database but `triage_outcome` in the LLM's structured data schema and the prompt.

---

### `callers`
Phone number registry. One row per unique caller, shared across all tenants (a caller's phone number exists once in this table regardless of how many tenants they've called).

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
phone_number    text    NOT NULL UNIQUE  -- E.164 or local format
full_name       text    -- ⚠️ Column is full_name, NOT name. Set from structuredData.caller_name
created_at      timestamptz DEFAULT now()
```

---

### `caller_tenant_relationships`
Per-tenant metadata about a caller. GDPR-sensitive.

```sql
id                          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id                   uuid    NOT NULL REFERENCES tenants
caller_id                   uuid    NOT NULL REFERENCES callers
is_hot_prospect             bool    DEFAULT false
marketing_opted_out         bool    DEFAULT false
opted_out_at                timestamptz
deletion_requested          bool    DEFAULT false
deletion_requested_at       timestamptz
created_at                  timestamptz DEFAULT now()

UNIQUE(tenant_id, caller_id)
```

**Opt-out detection:** vapi-webhook.js scans transcripts for removal phrases ('remove me from', 'opt out', 'unsubscribe', etc.) and upserts this row with `marketing_opted_out = true` and `deletion_requested = true` if found. This is automatic GDPR compliance.

---

### `leads`
Created when a call ends with outcome `lead_captured` or `booked`.

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid    NOT NULL REFERENCES tenants
caller_id           uuid    REFERENCES callers
call_log_id         uuid    REFERENCES call_logs
lead_contact_name   text    -- caller's name from structuredData
ai_summary          text    -- summary from Vapi (null for sensitive businesses)
status              text    DEFAULT 'new'  -- 'new'|'contacted'|'converted'|'lost'
created_at          timestamptz DEFAULT now()
```

---

### `referral_partners`
Trusted partner businesses that the tenant refers callers to.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
partner_name    text    NOT NULL
business_name   text
contact_phone   text    -- also used in caller classification Layer 4
contact_email   text
notes           text
created_at      timestamptz DEFAULT now()
```

---

### `referral_service_map`
Maps service keywords to referral partners. When Q identifies a caller needing a service not offered by the tenant, it finds the right partner via this table.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
partner_id      uuid    NOT NULL REFERENCES referral_partners
service_keyword text    NOT NULL  -- e.g. 'electrical', 'plastering', 'skip hire'
```

---

### `referral_log`
Audit log of referrals made by Q. Written by vapi-webhook.js when outcome = referred_out.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id   uuid    NOT NULL REFERENCES tenants
partner_id  uuid    NOT NULL REFERENCES referral_partners
created_at  timestamptz DEFAULT now()
```

---

### `call_handling_rules`
Per-call-type overrides for a tenant. One row per call type per tenant. If no row exists for a call type, defaults from `DEFAULT_RULES` in `_build-prompt.js` apply.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
call_type       text    NOT NULL  -- 'new_customer'|'partner_service'|'sales_call'|'supplier_delivery'|'invoice_authorities'
mode            text    -- 'open'|'balanced'|'strict'
booking_link    bool
callback        bool
email           bool
email_address   text    -- optional: specific email for this call type
instructions    text    -- optional: extra per-type instructions for Q

UNIQUE(tenant_id, call_type)
```

---

### `banned_services`
Services the tenant does NOT offer and does NOT want Q to handle. Q declines and refers out.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
banned_item     text    NOT NULL  -- service to decline
```

---

## Platform tables

### `tenant_integrations`
One row per integration per tenant. Stores connection status and configuration.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
integration_id  text    NOT NULL  -- 'whatsapp'|'zapier'|'google_calendar'|'messaging'|'freeagent'|'xero'|'gcal'
enabled         bool    DEFAULT false
settings        jsonb   DEFAULT '{}'  -- arbitrary config per integration type
created_at      timestamptz DEFAULT now()

UNIQUE(tenant_id, integration_id)
```

**After-call messaging config (integration_id = 'messaging'):**
```json
{
  "call_summary": {
    "enabled": true,
    "channel": "whatsapp",
    "template": "Hi {caller_name}, thanks for calling {business_name}. {lead_contact_name} will be in touch shortly."
  },
  "booking_link": {
    "enabled": false,
    "channel": "sms",
    "template": "Hi {caller_name}, book online here: {booking_link}"
  },
  "detail_confirmation": {
    "enabled": true,
    "channel": "whatsapp",
    "template": "Hi {caller_name}, please confirm: {appointment_datetime} at {appointment_address}."
  },
  "booking_confirmed": { "enabled": false, "channel": "email", "template": "" },
  "reminder": { "enabled": false, "channel": "whatsapp", "template": "" }
}
```

**WhatsApp config (integration_id = 'whatsapp'):**
```json
{
  "message_template": "Hi {caller_name}, thanks for calling..."
}
```

---

### `tenant_integration_credentials`
Sensitive credentials stored separately from integration config.

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid    NOT NULL REFERENCES tenants
integration_id      text    NOT NULL
phone_number_id     text    -- WhatsApp: Meta phone_number_id
access_token        text    -- WhatsApp: Meta access_token (permanent)
refresh_token       text    -- OAuth integrations (FreeAgent, Xero)
access_token_expires_at timestamptz

UNIQUE(tenant_id, integration_id)
```

---

### `vera_seen`
Tracks which onboarding tips and mascot messages each tenant has seen.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id   uuid    NOT NULL REFERENCES tenants
context_key text    NOT NULL  -- the tip/message identifier
seen_at     timestamptz DEFAULT now()
```

---

### `vera_speeches`
Pre-written Vera (Q mascot) speech text, keyed by context.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
context_key text    NOT NULL UNIQUE  -- ⚠️ column is context_key, NOT speech_key
speech_text text    NOT NULL
```

---

### `tenant_feedback`
Product feedback submitted by tenants.

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id       uuid    NOT NULL REFERENCES tenants
rating          integer  -- 1-5
feedback_text   text
created_at      timestamptz DEFAULT now()
```

---

### `campaigns`
SMS broadcast campaigns to callers.

```sql
id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           uuid    NOT NULL REFERENCES tenants
name                text
message             text    NOT NULL
recipient_count     integer DEFAULT 0
sent_count          integer DEFAULT 0
failed_count        integer DEFAULT 0
status              text    -- 'draft'|'sending'|'complete'|'failed'
search_context      text    -- description of the audience filter used
created_at          timestamptz DEFAULT now()
sent_at             timestamptz
```

---

### `business_type_subcategories`
Lookup table for business types. Determines whether a business is `is_sensitive` (legal, medical, financial — activates sealed call mode where Q takes name/number only).

```sql
id              uuid    PRIMARY KEY DEFAULT gen_random_uuid()
name            text    NOT NULL
is_sensitive    bool    DEFAULT false
category_id     uuid    -- parent category
```

---

### `kb_chunks` (planned — not yet created)
Will store Q's knowledge base as vector embeddings for RAG retrieval.

```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
file        text    NOT NULL    -- source file name e.g. 'KB-GETTING-STARTED.md'
heading     text    NOT NULL    -- H2 heading that was chunked
body        text    NOT NULL    -- the chunk content
embedding   vector(1536)        -- OpenAI text-embedding-3-small output
created_at  timestamptz DEFAULT now()
```

---

## Sentry tables

Five tables for the zone monitoring feature (Sentry.jsx). Only active when `tenants.sentry_camera_limit > 0`.

- `sentry_zones` — zones with camera limit config
- `sentry_events` — logged events (motion detected, etc.)
- `sentry_alerts` — alert rules per zone
- `sentry_subscriptions` — which tenants are subscribed to which zones
- `sentry_pins` — access PIN management (separate from `tenants.sentry_pin`)

These tables are not involved in the core call handling or booking flows.

---

## Support system tables

Created via `supabase_support_tables.sql`. Accessed only via service role (admin.js + vapi-webhook.js). No tenant-level RLS — all data is owner-only.

### `support_calls`
One row per support line call. Populated by `handleSupportCallEnd()` in `vapi-webhook.js` when the support phone number ID matches.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK→tenants | Matched by caller phone vs business_phone. Nullable (unidentified callers) |
| caller_phone | text | Raw phone number from Vapi |
| duration_seconds | integer | |
| complaint_category | text | 'A'\|'B'\|'C'\|'D'\|'unknown' |
| frustration_level | text | 'low'\|'medium'\|'high'\|'critical' |
| complaint_summary | text | One sentence — from analysis structuredData |
| referenced_call_log_id | uuid FK→call_logs | Nullable |
| gift_given | text | 'none'\|'free_minutes_10' |
| gift_rationale | text | |
| strike_count | integer DEFAULT 0 | |
| resolution | text | 'resolved'\|'escalated'\|'pending' |
| requires_escalation | boolean | Triggers WhatsApp + email to Support leadership |
| transcript | text | Full call transcript |
| ai_summary | text | AI summary from Vapi |
| created_at | timestamptz | |

### `support_policy`
**Single row only.** Philip's plain English instructions Q reads verbatim on every support call.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| policy_text | text | What Philip writes in plain English — no code or formatting |
| free_minutes_per_call | integer DEFAULT 10 | How many free minutes Q offers on Category B/C calls |
| max_strikes | integer DEFAULT 2 | Contacts before escalation on same unresolved issue |
| escalation_email | text | Where Category A + escalation alerts go |
| escalation_whatsapp | text | Phone number for WhatsApp alerts (nullable) |
| updated_at | timestamptz | |

**Always upsert this row — never insert a second row.** Seeded on migration with sensible defaults.

### `incidents`
Logged service failures.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text NOT NULL | Short description of what failed |
| description | text | Full detail |
| started_at | timestamptz NOT NULL | When the incident began |
| ended_at | timestamptz | Null while active |
| scope | text DEFAULT 'all' | 'all' = all non-free tenants |
| affected_tenant_ids | uuid[] | Used when scope != 'all' |
| status | text | 'active'\|'resolved'\|'compensated' |
| compensation_rate | integer DEFAULT 10 | Multiplier (10x is the Qerxel policy) |
| total_compensation_gbp | numeric | Set by incident-resolve action |
| created_at | timestamptz | |

### `compensation_log`
Generated automatically when an incident is resolved via `admin.js` action `incident-resolve`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| incident_id | uuid FK→incidents | |
| tenant_id | uuid FK→tenants | |
| downtime_minutes | integer | Calculated from started_at → ended_at |
| tier | text | Tenant's subscription_tier at time of incident |
| compensation_gbp | numeric | (monthly_value / mins_in_month) × downtime × 10 |
| status | text | 'pending'\|'paid'\|'credited' |
| paid_at | timestamptz | |
| created_at | timestamptz | |

---

## Query patterns — standard idioms used throughout the codebase

**Tenant data fetch (used identically in vapi-sync.js and vapi-assistant-request.js):**
```js
const [tenantRes, servicesRes, partnerServicesRes, callRulesRes, partnersRes, specialtiesRes, staffRes, catalogueRes] =
  await Promise.all([
    supabase.from('tenants').select('...').eq('id', tenantId).maybeSingle(),
    supabase.from('services').select('service_name').eq('tenant_id', tenantId),
    supabase.from('banned_services').select('banned_item').eq('tenant_id', tenantId),
    supabase.from('call_handling_rules').select('call_type, mode, booking_link, callback, email, email_address, instructions').eq('tenant_id', tenantId),
    supabase.from('referral_partners').select('id, partner_name, contact_phone').eq('tenant_id', tenantId),
    supabase.from('referral_service_map').select('partner_id, service_keyword'),
    supabase.from('staff_profiles').select('id, name, role, specialist_services, phone, direct_line_did, active').eq('tenant_id', tenantId),
    supabase.from('catalogue_items').select('name, description, price_from, price_to, duration_minutes, item_type').eq('tenant_id', tenantId).eq('active', true).order('name'),
  ])
```

**Sensitive business check (one extra query after tenant fetch):**
```js
if (tenantRes.data?.subcategory_id) {
  const { data: sub } = await supabase
    .from('business_type_subcategories')
    .select('is_sensitive')
    .eq('id', tenantRes.data.subcategory_id)
    .maybeSingle()
  isSensitive = sub?.is_sensitive === true
}
```

**Upsert pattern (used for integration config, caller_tenant_relationships):**
```js
await supabase
  .from('tenant_integrations')
  .upsert(
    { tenant_id: tenantId, integration_id: 'messaging', settings: config, enabled: true },
    { onConflict: 'tenant_id,integration_id' }
  )
```

**Monthly minute calculation (vapi-webhook.js):**
```js
const startOfMonth = new Date()
startOfMonth.setDate(1)
startOfMonth.setHours(0, 0, 0, 0)

const { data: monthCalls } = await supabase
  .from('call_logs')
  .select('duration_seconds')
  .eq('tenant_id', tenantId)
  .gte('created_at', startOfMonth.toISOString())

const totalSecs = (monthCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0)
const minutesUsed = Math.round(totalSecs / 60)
```
