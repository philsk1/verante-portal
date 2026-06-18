# Technical Architecture — Complete System Reference

## What Qerxel is at a system level

Qerxel is a multi-tenant SaaS platform that provides AI-powered call handling, booking management, client intelligence, and business analytics for UK sole traders and micro-businesses. Each business on the platform is called a tenant. Every tenant has their own isolated data, their own AI assistant configuration, and their own portal experience. The platform is built and operated by one person (Philip Keating) using AI-assisted development via Claude Code on Windows 11.

The system has two distinct operational modes:
1. **Portal** — A React web application at verante-portal.vercel.app where tenants configure their AI, manage their business data, and review call outcomes.
2. **Call handling** — A real-time serverless pipeline that activates when a call arrives on a tenant's phone number, builds a personalised AI assistant from live database data, handles the conversation via Vapi, and processes the outcome.

These two modes share the same Supabase database but operate independently. The portal is used by tenants when they are not on a call. The call pipeline runs automatically when a call comes in, with no human intervention required.

---

## Technology stack — complete list

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Database | Supabase (PostgreSQL) | All persistent data. Project ID: kkrsvkxkefijmtbwykzv |
| Auth | Supabase Auth | Tenant login, session management |
| Frontend | React 18 + Vite | Portal web application |
| Hosting | Vercel (Hobby plan) | Frontend and serverless API functions |
| Voice platform | Vapi | Call routing, speech-to-text, LLM orchestration, text-to-speech |
| LLM (calls) | OpenAI GPT-4o-mini | AI reasoning during phone calls |
| LLM (portal Q) | Claude Haiku (Anthropic) | In-portal support assistant (Vera) |
| STT | Deepgram Nova-2 | Speech-to-text on calls |
| TTS (standard) | Deepgram Aura (aura-stella-en) | Q's voice, standard tier |
| TTS (premium) | Cartesia Sonic | Q's voice, premium tier |
| Email | Resend | Transactional emails to tenants and callers |
| SMS | Twilio | SMS notifications to tenants; post-call SMS to callers |
| WhatsApp | Meta Cloud API | Post-call WhatsApp messages from tenant's own number |
| Spam detection | Twilio Lookup + Nomorobo add-on | Pre-answer spam classification |
| Scraping | Firecrawl | Scraping business websites during onboarding |
| Automation | Make.com (→ n8n at 30+ tenants) | Appointment reminders, post-call workflows |
| Payments | Stripe (not yet active) | Subscription billing |
| Accounting | FreeAgent + Xero (OAuth, configured not active) | Invoice integration |
| Calendar sync | Google Calendar (OAuth, configured not active) | Two-way appointment sync |

---

## Repository structure

```
verante-portal/
├── api/                          # Vercel serverless functions (12 slots max on Hobby plan)
│   ├── _build-prompt.js          # Builds Vapi system prompt + analysis plan from tenant data
│   ├── _emails.js                # Email template builders (Resend)
│   ├── _sms.js                   # SMS sender (Twilio)
│   ├── _whatsapp-send.js         # WhatsApp sender (Meta Cloud API)
│   ├── _zapier-webhook.js        # Zapier event dispatcher
│   ├── admin.js                  # Owner-only: tenant stats, OwnerSelector data
│   ├── freeagent.js              # FreeAgent OAuth + invoice endpoints (consolidated)
│   ├── ground-zero.js            # Owner-only: reseed demo tenant data
│   ├── integrations.js           # Tenant integration CRUD (WhatsApp, Zapier, reviews, etc.)
│   ├── notify.js                 # Appointment reminders + cron-triggered notifications
│   ├── onboarding.js             # Handles new tenant signup via Firecrawl scrape
│   ├── stripe-webhook.js         # Stripe billing events
│   ├── vapi-assistant-request.js # Vapi webhook: builds dynamic assistant per call
│   ├── vapi-sync.js              # Sync tenant config to Vapi; handles demo calls
│   ├── vapi-webhook.js           # Vapi end-of-call-report handler
│   └── xero.js                   # Xero OAuth endpoints
├── src/
│   ├── components/               # Shared UI components
│   │   ├── HelpMascot.jsx        # Q mascot + coaching panel (per-page mood)
│   │   ├── PortalSidebar.jsx     # Navigation sidebar
│   │   ├── VeraDialogue.jsx      # In-portal AI support chatbot
│   │   └── ...
│   ├── hooks/                    # Shared React hooks
│   │   ├── usePreview.js         # Owner preview mode state
│   │   └── QScoreContext.jsx     # Global Q score provider
│   ├── pages/                    # One file per portal page/tab
│   │   ├── Portal.jsx            # Root shell: auth, tab routing, preview mode
│   │   ├── ActivityDashboard.jsx # Home tab: stats, readiness checklist, quick actions
│   │   ├── AIBehaviour.jsx       # AI settings: all call handling configuration
│   │   ├── AccountSettings.jsx   # Account, billing, brand settings
│   │   ├── BookingPage.jsx       # Public booking page (customer-facing)
│   │   ├── BusinessProfile.jsx   # Business name, hours, context
│   │   ├── BusinessTab.jsx       # Business desk: team, services, suppliers, phone book
│   │   ├── Calendar.jsx          # Appointment calendar
│   │   ├── CalendarIntelligence.jsx # Schedule analytics
│   │   ├── ClientDirectory.jsx   # Contacts: callers + booking clients merged
│   │   ├── DataAnalytics.jsx     # Q Intelligence: outcomes, revenue, segments
│   │   ├── Integrations.jsx      # Integration configuration hub
│   │   ├── ListenTab.jsx         # Call log, transcripts, live desk
│   │   ├── Onboarding.jsx        # New tenant signup flow
│   │   ├── OwnerAudit.jsx        # Owner-only: system audit view
│   │   ├── OwnerSelector.jsx     # Owner-only: select tenant to preview
│   │   ├── PartnersReferrals.jsx # Referral partner management
│   │   ├── PhoneLines.jsx        # Phone number and Vapi configuration
│   │   ├── PlanSelector.jsx      # Tier selection and upgrade
│   │   ├── ProductCatalogue.jsx  # Product management
│   │   ├── Sentry.jsx            # Zone monitoring (camera/sensor areas)
│   │   ├── ServiceCatalogue.jsx  # Service management
│   │   ├── Signup.jsx            # Auth: login/register
│   │   ├── StaffDirectory.jsx    # Staff profiles and availability
│   │   └── ...
│   └── main.jsx                  # React entry point
├── knowledge-base/               # Q's knowledge base (this directory)
├── public/
│   └── qmood/                    # Q mascot PNG files (4 moods × 2 sizes)
├── CLAUDE.md                     # Session start instructions for Claude Code
├── CLAUDE-RULES.md               # Locked rules: style, deploy, schema constraints
├── CLAUDE-SCHEMA.md              # Database schema reference
├── CLAUDE-ARCH.md                # Architecture notes for Claude
├── CLAUDE-FILES.md               # File inventory
├── CLAUDE-PRODUCTS.md            # Product tiers and features
└── CLAUDE-TASKS.md               # Task log and next steps
```

---

## The two critical data flows

### Flow 1: Inbound call — complete sequence

```
1. Caller dials tenant's business number
2. Tenant has set up call forwarding → call forwards to tenant's Vapi phone number
3. Vapi receives the call
4. Vapi fires assistant-request webhook → POST /api/vapi-assistant-request
   Payload includes:
   - call.phoneNumberId (Vapi's ID for the tenant's phone number)
   - call.phoneNumber.number (the Vapi number that was called)
   - call.customer.number (the caller's phone number)
5. vapi-assistant-request.js runs:
   a. Identifies tenant by phoneNumberId → supabase.from('tenants').eq('vapi_phone_number_id', phoneNumberId)
   b. Fetches all tenant config in parallel (8 queries): tenant, services, banned_services,
      call_handling_rules, referral_partners, referral_service_map, staff_profiles, catalogue_items
   c. Checks if caller is spam (Twilio Lookup + Nomorobo) in parallel with tenant fetch
   d. If spam → return { error: { message: 'Call rejected.' } } → Vapi ends call silently
   e. Checks caller against blocked_phone_numbers[] → same rejection
   f. Classifies caller: supplier → partner → staff → customer (callers table) → appointments fallback → unknown
   g. Builds [CALLER CONTEXT] block if caller is known
   h. Builds personalised greeting if caller is known
   i. Builds system prompt via buildSystemPrompt(data) from _build-prompt.js
   j. Prepends caller context to system prompt if present
   k. Returns full Vapi assistant config:
      { assistant: { firstMessage, model: { provider, model, messages: [{ role: 'system', content: systemPrompt }] },
        voice, analysisPlan, serverUrl, serverMessages: ['end-of-call-report'], endCallFunctionEnabled } }
6. Vapi uses this config to handle the entire conversation
   - Deepgram Nova-2 transcribes caller speech
   - GPT-4o-mini generates Q's responses
   - Deepgram Aura or Cartesia speaks Q's responses
7. Call ends
8. Vapi fires end-of-call-report → POST /api/vapi-webhook
   Payload includes:
   - call.assistantId (tenant's vapi_assistant_id)
   - call.customer.number (caller's phone)
   - call.startedAt, call.endedAt
   - artifact.transcript (full verbatim transcript)
   - analysis.summary (AI-generated 1-2 sentence summary)
   - analysis.structuredData:
     { triage_outcome, caller_name, caller_email, referred_to,
       service_requested, appointment_address, appointment_datetime }
9. vapi-webhook.js runs:
   a. Identifies tenant by vapi_assistant_id
   b. If outcome = escalated → SMS/email owner immediately
   c. Find or create caller record in callers table
   d. Insert call_logs row (tenant_id, caller_id, caller_phone, duration_seconds, transcript, ai_summary, call_outcome)
   e. dispatchAfterCallMessages() → reads tenant messaging config → fires WhatsApp/SMS/email to caller
   f. If outcome = lead_captured or booked → insert leads row + email owner notification
   g. If sms_followup_enabled → send legacy SMS to caller
   h. If WhatsApp integration enabled → send WhatsApp to caller
   i. If outcome = referred_out → insert referral_log row
   j. Check minute thresholds → fire 80%/exhausted notifications if needed
   k. Opt-out detection on transcript → update caller_tenant_relationships if requested
```

### Flow 2: Portal save → Vapi sync

```
1. Tenant makes changes in AIBehaviour.jsx and clicks Save AI Settings
2. Frontend calls supabase.from('tenants').update({ ...allSettings }).eq('id', tenantId)
3. Frontend calls POST /api/vapi-sync with { tenantId }
4. vapi-sync.js runs:
   a. Fetches full tenant config from Supabase (same 8 queries as assistant-request)
   b. Calls buildSystemPrompt(data) to generate current system prompt
   c. Calls buildGreeting() to generate current greeting
   d. If tenant has no vapi_assistant_id → POST to Vapi /assistant → save returned ID to tenants table
   e. If tenant has vapi_assistant_id → PATCH to Vapi /assistant/{id} with new config
5. Sync status chip in UI confirms completion
```

---

## Tenant identification on inbound calls

The system uses two fallback methods to identify which tenant owns an inbound call:

**Primary:** `call.phoneNumberId` → `tenants.vapi_phone_number_id`
Each Vapi phone number has a unique ID in the Vapi system. When a call arrives, this ID identifies the tenant.

**Fallback:** `call.phoneNumber.number` → `tenants.vapi_phone_number`
The E.164 phone number string (e.g. +441234567890) as backup if phoneNumberId matching fails.

If neither matches, the call receives a generic error message and is not logged.

---

## Caller classification — 7-layer priority chain

Executed in vapi-assistant-request.js classifyCaller() function. First match wins.

```
Layer 1: Spam check (Twilio Lookup + Nomorobo)
  → Runs in parallel with tenant data fetch
  → score === 1 from Nomorobo = confirmed spam
  → Fails OPEN — API timeout never blocks a real call
  → Rejection: return { error: { message: 'Call rejected.' } } to Vapi
  → Only fires if spam_filter_enabled !== false on tenant

Layer 2: Blocked numbers
  → tenants.blocked_phone_numbers[] — array of E.164 or local format numbers
  → Matched using phonesMatch() with last-9-digits fallback for format tolerance
  → Same rejection response as spam

Layer 3: Supplier
  → supabase.from('suppliers').eq('tenant_id', tenantId)
  → Match on suppliers.phone using phonesMatch()
  → Returns { type: 'supplier', supplier: { id, name, email, phone, notes } }

Layer 4: Referral partner
  → Already fetched in tenant data (referral_partners table)
  → Match on referral_partners.contact_phone using phonesMatch()
  → Returns { type: 'partner', partner: { ...partnerData, specialties: [] } }

Layer 5: Staff
  → Already fetched in tenant data (staff_profiles table)
  → Match on staff_profiles.phone using phonesMatch()
  → Returns { type: 'staff', staff: { id, name, role, ... } }

Layer 6: Returning customer — callers table
  → supabase.from('callers').eq('phone_number', callerPhone)
  → If found: fetch caller_tenant_relationships + last 5 appointments (client_phone match, completed/confirmed)
  → Returns { type: 'customer', caller, relationship, appointments }

Layer 6b: Returning customer — appointments fallback
  → If no callers table match: supabase.from('appointments').eq('client_phone', callerPhone).eq('tenant_id', tenantId)
  → Catches seed customers and anyone who booked but was never added to callers table
  → Returns { type: 'customer', caller: { id: null, full_name: clientName }, relationship: null, appointments }

Layer 7: Unknown
  → Returns { type: 'unknown' }
  → Standard Q behaviour applies
```

**Phone number normalisation (phonesMatch / normPhone):**
UK numbers are stored in mixed formats across the system. The matching function normalises before comparing:
- Strip all spaces, dashes, brackets, dots
- +447XXXXXXXXX → 07XXXXXXXXX
- 447XXXXXXXXX → 07XXXXXXXXX
- Final fallback: compare last 9 digits only (handles any remaining prefix variations)

---

## The prompt system — three layers

The system prompt fed to GPT-4o-mini on every call is built from three layers in _build-prompt.js:

**Layer 1 — Qerxel core (immutable)**
LAYER_1_CORE_VALUES: language rules, prohibited phrases ("Absolutely", "Certainly", "Great question"), warmth requirements, honesty about being AI.
LAYER_1_JUDGEMENT: override rule — common sense always beats configured rules. Human safety beats everything.

**Layer 2 — Caller context (per-call, injected before Layer 3)**
[CALLER CONTEXT] block built by buildCallerContext(classification):
- supplier: name, account notes, likely reason for call
- partner: business name, specialties, B2B call handling note
- staff: name, role, internal call note
- customer: name, visit count, last service, rebook prompt
- unknown: null (no injection, standard behaviour)

**Layer 3 — Tenant config (per-tenant, built from DB)**
Built by buildSystemPrompt(data). Contains in order:
1. Business identity (name, tone register, UK English instruction)
2. Greeting (exact text Q must open with, built by buildGreeting())
3. Taking details instruction (buildPleaseAllowMe() — "Please allow me to...")
4. About the business (opening hours, business context)
5. Services (catalogue items preferred over plain services list)
6. Partner services and partner businesses
7. Team members (staff with roles, specialisms, direct lines)
8. Call type rules (5 types × mode/closing options/custom instructions)
9. Filters (spam, sales, autodialler detection instructions)
10. Emergency keywords (escalation trigger words)
11. Keep-alive topics (never end call while discussing)
12. Provisional booking rule (if enabled)
13. Additional instructions (free text from tenant)
14. Communication style and pace (buildSpeechSection())
15. Required outcome taxonomy (triage_outcome values + caller_name, referred_to)

---

## Database — Supabase project details

**Project:** kkrsvkxkefijmtbwykzv
**URL:** https://kkrsvkxkefijmtbwykzv.supabase.co
**Region:** EU West (London)
**Anon key:** Used in frontend (React) only — read access with RLS
**Service role key:** Used in API functions only — bypasses RLS — stored as SUPABASE_SERVICE_ROLE_KEY env var — NEVER in frontend

**Row Level Security:** Enabled on all tenant tables. Tenants can only see their own rows. Owner (finsolsoffice@gmail.com) has an RLS bypass policy applied via supabase_owner_rls.sql.

**Critical schema constraints (violations cause runtime errors):**
- appointments.status: must be one of: provisional, confirmed, completed, cancelled, no_show — NOT 'scheduled'
- appointments.title: NOT NULL — always set as "${service} — ${client_name}"
- staff_profiles.colour: British English spelling — NOT 'color'
- staff_availability: NO tenant_id column
- Always use .maybeSingle() not .single() — .single() throws 406 on 0 rows

---

## Environment variables — complete list

All set in Vercel project settings. Never committed to git.

| Variable | Used in | Source |
|----------|---------|--------|
| SUPABASE_SERVICE_ROLE_KEY | All API files | Supabase dashboard → Settings → API |
| VAPI_PRIVATE_KEY | vapi-sync.js, vapi-assistant-request.js | Vapi dashboard → API Keys |
| VAPI_DEMO_PHONE_NUMBER_ID | vapi-sync.js | Vapi dashboard → Phone Numbers → copy ID |
| TWILIO_ACCOUNT_SID | vapi-assistant-request.js, _sms.js | Twilio console |
| TWILIO_AUTH_TOKEN | vapi-assistant-request.js, _sms.js | Twilio console |
| RESEND_API_KEY | _emails.js | Resend dashboard |
| CARTESIA_STANDARD_VOICE_ID | vapi-sync.js, vapi-assistant-request.js | Cartesia dashboard |
| CARTESIA_PREMIUM_VOICE_ID | vapi-sync.js, vapi-assistant-request.js | Cartesia dashboard |
| SITE_URL | vapi-webhook.js, notify.js | https://verante-portal.vercel.app |
| STRIPE_SECRET_KEY | stripe-webhook.js | Stripe dashboard |
| STRIPE_WEBHOOK_SECRET | stripe-webhook.js | Stripe dashboard → Webhooks |
| CRON_SECRET | notify.js | Any random secure string |
| FIRECRAWL_API_KEY | onboarding.js | Firecrawl dashboard |
| OPENAI_API_KEY | Used by Vapi directly (BYOK) | OpenAI dashboard |
| ANTHROPIC_API_KEY | VeraDialogue.jsx / portal Q | Anthropic console |
| SUPABASE_PAT | Local .env only — management API queries | Supabase dashboard → Account → Access Tokens |
| VITE_SUPABASE_URL | Frontend (React) | https://kkrsvkxkefijmtbwykzv.supabase.co |
| VITE_SUPABASE_ANON_KEY | Frontend (React) | Supabase dashboard → Settings → API |
| VITE_VAPI_PUBLIC_KEY | Frontend — Vapi Web SDK (ear test) | Vapi dashboard |

---

## Vercel deployment

**Deploy command:** `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod`
Run from: `C:\Users\philo\Documents\verante-portal`
Shell: Git Bash on Windows 11

**Constraint:** Vercel Hobby plan allows maximum 12 serverless functions (files in /api/).
Current count: 12/12. Any new API endpoint requires consolidating an existing one first.
At 30+ tenants, upgrade to Vercel Pro (£16/month) to remove this limit.

**Build:** Vite builds React to /dist. Vercel serves dist/ as static. API files run as serverless functions on Node.js 24.

**Live URL:** https://verante-portal.vercel.app
**GitHub:** https://github.com/philsk1/verante-portal (deploys automatically on push, or manually via CLI)

---

## Multi-tenancy model

Every table that contains tenant-specific data has a `tenant_id` UUID column that references `tenants.id`. RLS policies ensure tenants can only query their own rows.

The owner (Philip) has a special RLS bypass policy that allows querying all tenants' data. This is used in the OwnerSelector and admin.js endpoint.

**Owner email (hardcoded in admin.js and ground-zero.js):** finsolsoffice@gmail.com

**Tenant lifecycle:**
1. User registers → Supabase Auth creates user record
2. Onboarding.jsx collects business details → creates tenants row → creates tenant_memberships row linking user to tenant
3. Onboarding fires vapi-sync → creates Vapi assistant → saves vapi_assistant_id to tenants table
4. Owner provisions Vapi phone number → saves vapi_phone_number + vapi_phone_number_id to tenants row
5. Tenant sets up call forwarding on their existing business number → live

---

## Owner-only features

The owner (Philip) accesses these via the portal with their own account:

**Owner Selector** (`/owner/select`): View all 41+ tenants, sorted by performance/revenue/size. Shows Q score, appointment count, tier, subscription value. Click any tenant to enter preview mode.

**Preview mode**: Owner can browse any tenant's portal as if they were that tenant. A banner at the top shows "Owner preview" with an option to switch to Edit mode (makes changes on the tenant's behalf).

**Ground Zero** (`api/ground-zero.js`): Owner-only endpoint. Reseeds a demo tenant's catalogue and appointments from sector-specific templates. Called from OwnerSelector UI. Requires ownerEmail in request body matching hardcoded OWNER_EMAIL constant.

**Admin endpoint** (`api/admin.js`): Returns aggregate stats across all tenants for the OwnerSelector dashboard — appointment counts, call counts, Q scores.
