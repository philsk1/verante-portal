# QERXEL — DATABASE SCHEMA
## Supabase project: kkrsvkxkefijmtbwykzv · RLS enabled on all tables

---

## Core tables

### `tenants`
Single row per business. Central config for all products.

Key columns:
```
id uuid PK
business_name, business_phone, business_email, business_address
subscription_tier     -- Answer tier: 'free'|'light'|'standard'|'professional'|'enterprise'|'bespoke'|'schedule_only'
calendar_tier         -- 'none'|'entry'|'multi'
listen_tier           -- 'none'|'standard'
sentry_camera_limit   -- 0 = inactive
sentry_pin            -- 4-digit string or null
vapi_phone_number
vapi_assistant_id
keep_alive_topics text[]  DEFAULT ARRAY['appointment booking','product enquiry','senior citizen']
keep_alive_max_minutes integer DEFAULT 5
q_dismissals jsonb DEFAULT '{}'  -- per-page dismissal timestamps {"ai": "2026-06-13T..."}
q_mode        -- 'very_helpful'|'jump_in'|'mind_own_business'
notify_new_lead bool, notify_daily_summary bool, notify_weekly_report bool
data_retention_days integer DEFAULT 90
billing_model, monthly_cost_limit
booking_buffer_mins, cancel_cutoff_hrs, client_can_reschedule
charge_late_cancel, no_show_fee, no_show_fee_type, no_show_fee_pct
brand_colour varchar(7)           -- custom booking page accent colour
logo_url text                     -- hosted logo URL for booking page header
booking_promo_text text           -- banner shown on booking page (160 char)
booking_promo_expires_at timestamptz
hide_qerxel_ad bool DEFAULT false -- professional+ only: hide discovery card (not the footer)
feedback_prompt_shown bool
created_at
```

**`subscription_tier = 'schedule_only'`** — tenant has Schedule but NOT Answer. Use `hasAnswerProduct = !!subscription_tier && subscription_tier !== 'schedule_only'` everywhere.

### `tenant_memberships`
Links `auth.users` → `tenants`. Always query this to resolve `tenantId` from `user.id`.
```
user_id uuid FK → auth.users
tenant_id uuid FK → tenants
```
Pattern: `supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()`

---

## Schedule tables

### `appointments`
```
id uuid PK
tenant_id uuid FK
staff_profile_id uuid FK → staff_profiles (nullable)
service_id uuid FK → catalogue_items (nullable)
title text NOT NULL           -- always set: `${service} — ${client_name}`
appointment_type text         -- service name string
client_name, client_phone, client_email, client_notes
start_time, end_time timestamptz
processing_end_time timestamptz (nullable — for processing_minutes services)
status  -- 'provisional'|'confirmed'|'completed'|'cancelled'|'no_show'  ← NOT 'scheduled'
created_from  -- 'manual'|'customer_booking'
cancel_token uuid DEFAULT gen_random_uuid()  -- used for /manage-booking/:token links
reminder_sent_24h bool DEFAULT false
reminder_sent_1h bool DEFAULT false
description text
```

### `staff_profiles`
```
id uuid PK
tenant_id uuid FK
name text
role text
colour varchar(7)    -- ← British English. NOT color.
bio text
phone text
email text
address text
birthday text
specialist_services text[]   -- ← column name is specialist_services, NOT tags
direct_line_did text
private_notes text
active bool
```

### `staff_availability`
⚠️ **NO `tenant_id` column** — linked to tenant only via `staff_profiles` FK.
```
id uuid PK
staff_profile_id uuid FK → staff_profiles
day_of_week integer  -- 0=Sun ... 6=Sat
start_time time, end_time time
active bool
```
Query pattern: fetch staff IDs first, then `.in('staff_profile_id', staffIds)`

### `catalogue_items`
Shared between Answer (AI reads for service knowledge) and Schedule (booking page, calendar).
```
id uuid PK
tenant_id uuid FK
name text
description text
item_type  -- 'service'|'product'
category text
price_from numeric, price_to numeric    -- NOT price
duration_minutes integer
processing_minutes integer (nullable)
active bool DEFAULT true
colour varchar(7)    -- ← British English. Used by ServiceCatalogue for calendar colour coding.
internal_notes text  -- owner-visible only, AI does NOT read this
supplier_id uuid FK → suppliers(id) ON DELETE SET NULL  -- nullable
product_url text  -- checkout / info page URL. Used by Listen Pro hand-off. nullable.
```

### `suppliers`
Supplier directory per tenant. Linked to catalogue_items via supplier_id.
Used by Business Desk to generate one-click order mailto: links.
```
id uuid PK
tenant_id uuid FK
name text NOT NULL
email text
phone text
notes text  -- account number, rep name, etc.
created_at timestamptz
```
RLS: `is_tenant_member(tenant_id)` — same pattern as catalogue_items.

---

## Answer tables

### `call_logs`
```
id uuid PK
tenant_id uuid FK
caller_id uuid FK → callers
caller_phone text
started_at, ended_at timestamptz
duration_seconds integer
call_outcome text   -- ← column is call_outcome, NOT outcome. Values: 'lead_captured'|'booked'|'handled'|'escalated'|'filtered'|'spam'|'hard_close'
ai_summary text
transcript text
```

### `callers`
⚠️ Column is `full_name`, NOT `name`.
```
id uuid PK
phone_number text
full_name text
```

### `caller_tenant_relationships`
GDPR columns: `marketing_opted_out bool`, `opted_out_at`, `is_hot_prospect bool`, `deletion_requested bool`, `deletion_requested_at`

### `leads`
```
id uuid PK
tenant_id uuid FK
caller_id uuid FK
intent text
notes text
created_at
```

### `referral_partners`, `referral_service_map`, `referral_log`
Partner referral network. `referral_service_map` links intent → partner.

### `banned_services`
Topics AI won't handle. Read by `_build-prompt` API.

---

## Platform tables

### `vera_seen`, `vera_speeches`
`vera_speeches` column is `context_key` (NOT `speech_key`).

### `tenant_feedback`
Product feedback. Columns: `tenant_id, rating, feedback_text, created_at`.

### `campaigns`
SMS campaigns. Columns: `id, tenant_id, name, message, recipient_count, sent_count, failed_count, status, search_context, created_at, sent_at`.

### `tenant_catalogue`
Enterprise scraped content from Firecrawl. Read by CalendarIntelligence.

---

## Sentry tables (5 tables)
Built in task 28. Used by `Sentry.jsx`. Require `sentry_camera_limit > 0` on tenant.

---

## Support system tables (4 tables)
Created in `supabase_support_tables.sql` — run 2026-06-15. All accessed via service role only (no tenant-level RLS needed — owner-only).

### `support_calls`
One row per support line call. Columns: `id uuid PK, tenant_id uuid FK→tenants (nullable), caller_phone text, duration_seconds integer, complaint_category text ('A'|'B'|'C'|'D'|'unknown'), frustration_level text ('low'|'medium'|'high'|'critical'), complaint_summary text, referenced_call_log_id uuid FK→call_logs (nullable), gift_given text ('none'|'free_minutes_10'), gift_rationale text, strike_count integer DEFAULT 0, resolution text ('resolved'|'escalated'|'pending'), requires_escalation boolean, transcript text, ai_summary text, created_at timestamptz`.

### `support_policy`
Single row — Philip's plain English instructions Q reads on every support call. Columns: `id uuid PK, policy_text text, free_minutes_per_call integer DEFAULT 10, max_strikes integer DEFAULT 2, escalation_email text, escalation_whatsapp text, updated_at timestamptz`.

Seeded with one default row on migration. Always upsert by checking `id` of the existing row. There is exactly one row.

### `incidents`
Logged service failures. Columns: `id uuid PK, title text, description text, started_at timestamptz, ended_at timestamptz, scope text DEFAULT 'all', affected_tenant_ids uuid[], status text ('active'|'resolved'|'compensated'), compensation_rate integer DEFAULT 10, total_compensation_gbp numeric, created_at timestamptz`.

`scope = 'all'` means all non-free tenants affected. `affected_tenant_ids` is populated when only some tenants were affected.

### `compensation_log`
Per-tenant compensation records generated on incident resolution. Columns: `id uuid PK, incident_id uuid FK→incidents, tenant_id uuid FK→tenants, downtime_minutes integer, tier text, compensation_gbp numeric, status text ('pending'|'paid'|'credited'), paid_at timestamptz, created_at timestamptz`.

Generated automatically by `admin.js` action `incident-resolve`. Compensation = (monthly tier value / minutes in month) × downtime_minutes × 10.

---

## Q audit tables

### `q_chat_logs`
Every Q conversation turn. Populated by `logChatTurn()` in `api/_audit.js` (fire-and-forget, never blocks response). Q never reads this table — it is the audit trail only.
```
id            uuid PK
session_id    text              -- optional grouping key for multi-turn conversations
handler       text              -- 'vera' | 'support' | 'policy-chat' | 'orchestrate'
tenant_id     uuid FK→tenants (nullable)
tenant_tier   text              -- subscription_tier at time of turn
zone_name     text              -- for 'vera': which feature the user clicked Q on
user_message  text (5000 char cap)
q_response    text (10000 char cap)
brief_version text DEFAULT '1.0'
created_at    timestamptz
```
Indexes on `handler`, `tenant_id`, `created_at DESC`, `zone_name`.

### `q_brief`
Versioned behavioural specification for Q. The auditor reads this. Q never queries this table. Updated by Philip when Q's operating mandate changes. Each version is stored permanently.
```
id          uuid PK
version     text UNIQUE       -- '1.0', '1.1', etc.
handler     text DEFAULT 'all'
brief_text  text              -- the full behavioural spec (NOT the system prompt — the spec the prompt implements)
notes       text              -- what changed and why
active      boolean
created_at  timestamptz
created_by  text
```
Seeded with v1.0 on 2026-06-16. To update: insert new row with incremented version, set previous active=false.

### `meaning_map`
The semantic tree of what clients interact with. Trunk → branches → twigs. Twigs are seeded from kb_chunks. **Q never reads this table.** Only the auditor, admin.js, and MasterControl read it. Weights grow through use.
```
id                uuid PK
parent_id         uuid FK→meaning_map (self-referential, RESTRICT on delete)
level             text CHECK ('trunk'|'branch'|'twig')
label             text              -- section heading (for twigs) or branch/trunk name
description       text
kb_chunk_file     text              -- for twigs: links to kb_chunks.file
kb_chunk_section  text              -- for twigs: links to kb_chunks.section
occurrence_count  integer DEFAULT 0 -- the weight: incremented atomically on each matched interaction
last_occurred_at  timestamptz
status            text DEFAULT 'active' CHECK ('active'|'proposed'|'rejected')
proposed_by       text              -- 'auditor' for auto-proposals
created_by        text
created_at        timestamptz
```
Seeded: 1 trunk, 6 branches (Call Handling / Caller Intelligence / Calendar & Booking / Business Setup / Integrations / Technical Reference), 284 twigs from kb_chunks.
Increment function: `increment_meaning_count(p_twig_id uuid)` — atomic UPDATE, never read-modify-write.
Unmatched interactions: `q_chat_logs WHERE meaning_id IS NULL` — these are what the map doesn't yet cover.

### `q_audit_samples`
1-in-20 sample of matched interactions stored in full for compliance auditing. Never used by Q.
```
id, handler, tenant_id, tenant_tier, zone_name, user_message, q_response, brief_version, meaning_id FK→meaning_map, sampled_at
```

### `q_audits`
Compliance reports from the auditor. Populated by the audit endpoint (future). Never read by Q.
```
id            uuid PK
brief_version text
sample_size   integer
period_start  timestamptz
period_end    timestamptz
triggered_by  text   -- 'auto' | 'manual' | 'signal_threshold'
overall_score numeric(4,1)
violations    jsonb DEFAULT '[]'
patterns      jsonb DEFAULT '[]'
summary       text
raw_report    text
created_at    timestamptz
```

## Q aggregate views

### `q_aggregate_signals`
Setting distribution across all tenants grouped by subscription_tier. Read by Q Intelligence and future audit engine. Shows what configurations are common at each tier — the "collective inference" layer.

### `q_chat_patterns`
Weekly rollup of what zones/topics Q is asked about most, by handler. Source of truth for which features need better documentation or where Q's knowledge gaps are.

---

## Q knowledge base table

### `kb_chunks`
Full-text search index of all knowledge-base/KB-*.md files. Populated by `scripts/index-kb.cjs` (run locally, not via cron). Search via Postgres `match_kb_chunks()` function. Used by `api/_kb.js` ragSearch helper, injected into Q's system prompt in handleVera.
```
id          uuid PK
file        text              -- 'KB-COMPLAINTS.md', 'KB-CALENDAR.md', etc.
section     text              -- H2 heading the chunk falls under
content     text              -- heading + body text, capped at 2500 chars
fts         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
created_at  timestamptz
```
GIN index on `fts`. Search function: `match_kb_chunks(query text, match_count int DEFAULT 5)` → returns `(file, section, content, rank)`.
Re-index after KB file changes: `node scripts/index-kb.cjs` (Windows: prefix `NODE_OPTIONS=--use-system-ca`).

---

## Owner RLS bypass
`supabase_owner_rls.sql` — run 2026-06-14. Grants SELECT on 13 tables + `staff_availability` for `finsolsoffice@gmail.com`.
