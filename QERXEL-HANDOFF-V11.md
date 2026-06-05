# QERXEL — COMPLETE PROJECT HANDOFF DOCUMENT V11
Paste this in full at the start of every new conversation thread.
Last updated: 2026-06-05 (session 5)

---

## WHAT QERXEL IS

A multi-tenant AI call handling and lead capture SaaS platform targeting solo operators and micro-service businesses in the UK. Hair salons, tradespeople, local service providers. The core product answers missed calls, triages caller intent, captures lead details, refers out-of-scope callers to partner businesses, and routes the caller to a booking link or callback.

Working name: Qerxel. Name not yet legally confirmed.

---

## STRATEGIC FOUNDATIONS — LOCKED

Price point is deliberately aggressive. Designed to eliminate decision friction for sole traders who have never bought software. Traction and data flywheel take priority over margin at this stage.

The product is not a call answering service. It is a CRM that happens to start with a phone call. The phone call is the data ingestion point. Every downstream feature — follow-up messaging, pricing intelligence, referral network, win rate coaching — compounds on that foundation.

The flywheel: better system → tenant leans on it more → more data → smarter system → more value → more referrals → network density increases → each tenant gets more inbound referrals → leaning increases further.

Referral psychology: a tenant who has sent four referrals out actively demands reciprocation. This creates membership culture not just word of mouth. The referral network is owned entirely by the tenant — Qerxel is the infrastructure that makes it visible and reciprocal.

Core sales framing — LOCKED: "Never miss another lead." The anxiety a busy tradesperson feels about missing a call while they are under a sink — that is the problem this solves.

---

## FOUNDER ROLE — LOCKED

Strategy, metadata, steering on percentage gains, keeping architecture ahead of the next crunch. Not support, not wet-nursing, not operations.

Tech hires deliberately deferred. Risk window is 50–500 tenants. Three protections: AI handles support, agencies over employees in this window, any human hire works the human layer not the technical one.

Founder background: Philip Keating. 27 years running a physical manufacturing business in print. Peaked at 55 staff. Scaling instincts significantly more reliable than a first-time founder.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools. PowerShell does not support && — always run two separate commands. Always uses Bash tool when available.

---

## TIER STRUCTURE — UPDATED 2026-06-05

| Tier | Price | Concurrent calls | Minutes |
|------|-------|-----------------|---------|
| Free | £0/mo (PAYG £0.35/min) | 1 | 0 (pay as you go) |
| Light | £29/month | 1 | 120 |
| Standard | £49/month | 1 | 250 |
| Professional | £69/month | 2 | 450 |
| Enterprise | £249/month | 3+ | 1,000 |
| Bespoke | Contact us | Custom | Custom |

Overage (subscription tiers): Premium voice £0.18/min · Standard voice £0.14/min
PAYG: flat £0.35/min on Standard voice. No included minutes.
Enterprise has NO referral network cap.

**Voice tiers:** Premium = Cartesia Sonic 3.5 + GPT-4o mini. Standard = Cartesia Sonic 3 + Gemini Flash.

**Tier checks in code — always use this pattern:**
```javascript
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

---

## TECH STACK — CONFIRMED

| Component | Technology |
|-----------|------------|
| Telephony | Vapi with BYOK pricing |
| STT | Deepgram Nova-2 |
| LLM | Gemini 1.5 Flash or GPT-4o mini (Vapi calls) |
| TTS | Cartesia or Deepgram Aura |
| Database | Supabase (PostgreSQL) |
| Automation | Make.com → migrating to self-hosted n8n at 30 tenants |
| Frontend | React/Vite deployed to Vercel |
| SMS | Twilio Messaging |
| Email | Resend (transactional — daily cost reports) |
| Website scraping | Firecrawl (onboarding) |
| Vera AI | Claude Haiku (Anthropic API — vera-chat, greeting-generator, support-chat, scrape-website) |

---

## SUPABASE — CONFIRMED DETAILS

Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co

Anon key (legacy HS256 — use this, not the sb_publishable_ format):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ

GitHub: https://github.com/philsk1/qerxel-portal
Live URL: https://qerxel-portal.vercel.app

### RLS STATUS — ENABLED

RLS is ENABLED on all production tables as of 2026-06-04. Script: `supabase_rls.sql` (idempotent, safe to re-run). Helper function: `is_tenant_member(tid)`.

HS256 anon key confirmed working with `auth.uid()`. NEVER switch to ES256 `sb_publishable_` key — PostgREST cannot validate ES256 tokens, auth.uid() returns null in all policies.

Vapi webhook uses service_role key — bypasses RLS on inserts. This is correct.
Owner preview API endpoint (api/owner-tenants.js) uses service_role key — bypasses RLS for tenant list fetch. This is correct.

Demo tables (demo_*) have no RLS — they are public read-only demo data.

---

## DATABASE — COMPLETE AND DEPLOYED

### Production tables (all live, RLS enabled):
business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules, vera_speeches, vera_seen, appointments, staff_availability, tenant_catalogue

**Pending (in supabase_migrations_session4.sql — must be run):** appointments, staff_availability, tenant_catalogue tables + all new tenant columns from session 4/5.

### Demo tables (all live, no RLS — public read):
demo_businesses, demo_services, demo_staff, demo_partners, demo_call_logs, demo_leads, demo_referral_log, demo_pricing_intelligence, demo_competitor_intelligence, demo_users, demo_sessions

Seed script: `demo_seed.sql` in project root. Safe to re-run (truncates before reseeding).

### KEY TABLE SCHEMAS

**tenants** — key columns:
business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords (text[]), tone_register, business_outcome_type, callback_preference_note, urgent_callback_mins, additional_instructions, vapi_assistant_id, tier, data_retention_days (integer default 90), billing_model (text — 'subscription' or 'payg'), monthly_cost_limit (integer — PAYG tenants only), overage_voice_preference (text default 'premium')

Pending migrations (not yet run):
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number text;
```

**call_logs** — key columns used by portal tabs:
- ActivityDashboard reads: `id, created_at, duration_seconds, ai_summary, call_outcome, caller_phone, callers(phone_number, full_name)`
- DataAnalytics reads: `id, created_at, duration, triage_outcome`
- Note: `call_outcome` and `triage_outcome` are separate columns; `duration` and `duration_seconds` are separate columns

**call_handling_rules:**
```
id uuid pk, tenant_id uuid fk→tenants, call_type text,
mode text, booking_link boolean, callback boolean, email boolean,
email_address text, instructions text, created_at timestamptz,
unique(tenant_id, call_type)
```
call_type values: new_customer, partner_service, sales_call, supplier_delivery, invoice_authorities

**staff_profiles:**
```
id uuid pk, tenant_id uuid fk→tenants, name text, role text,
specialist_services text, phone text, active boolean default true, created_at timestamptz
```

**profiles** — key columns:
id (= auth.uid()), email, is_owner (boolean — owner-only flag for preview mode. Set true for finsolsoffice@gmail.com in Supabase Table Editor.)

**vera_speeches:** context_key text (unique), speech_text text
**vera_seen:** tenant_id uuid, speech_key text, seen_at timestamptz

**demo_businesses** — key columns:
id (fixed uuid), business_name, business_type, tier, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, tone_register, business_outcome_type, greeting_message, included_minutes, credits_balance, referral_code

**demo_call_logs** — key columns:
id, business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at
(both call_outcome and triage_outcome stored for compatibility with ActivityDashboard and DataAnalytics)

**demo_services:** id, business_id, service_name, is_partner_service (boolean)
**demo_staff:** id, business_id, name, role, specialist_services, phone, active
**demo_partners:** id, business_id, partner_name, partner_phone, specialty
**demo_leads:** id, business_id, caller_name, caller_number, enquiry_type, notes, status, created_at
**demo_referral_log:** id, business_id, partner_name, caller_name, service_requested, created_at
**demo_sessions:** id, user_id, business_id, tier, started_at, ended_at
**demo_users:** id, email, name, role, access_code
Test account: demo@qerxel.app / QERXEL2026

---

## DEMO BUSINESSES — FIXED IDs

| UUID suffix | Business | Tier |
|-------------|----------|------|
| ...000000000001 | Bella's Hair Studio | standard |
| ...000000000002 | Fast Flow Plumbing | professional |
| ...000000000003 | Bright Spark Electrical | light |
| ...000000000004 | Green Thumb Gardens | standard |
| ...000000000005 | Pawfect Grooming | light |
| ...000000000006 | Peak Performance PT | standard |
| ...000000000007 | Clarity Accounting | professional |
| ...000000000008 | Spotless Cleaning Co | standard |
| ...000000000009 | Fresh Coat Decorating | light |
| ...000000000010 | Restore Physiotherapy | enterprise |
| ...000000000099 | demo@qerxel.app (user) | — |

Full UUID pattern: `00000000-0000-0000-0000-00000000000X`

---

## FRONTEND — CONFIRMED WORKING

Dev server: run two commands separately — `cd C:\Users\philo\qerxel-portal` then `npm run dev`
Runs on http://localhost:5173 (may shift to 5174/5175 if ports occupied)

Key files:
```
src/supabase.js                      — legacy HS256 anon key hardcoded (correct)
src/context/AuthContext.jsx          — Supabase auth session
src/context/DemoContext.jsx          — demo data provider; all 6 tabs check useDemo()
src/context/PreviewContext.jsx       — enterPreview/exitPreview/isPreview for owner mode
src/pages/Login.jsx, Signup.jsx, Onboarding.jsx, Portal.jsx
src/pages/BusinessProfile.jsx, AIBehaviour.jsx, ActivityDashboard.jsx
src/pages/DataAnalytics.jsx, PartnersReferrals.jsx, AccountSettings.jsx
src/components/HelpMascot.jsx        — Vera owl + full dialogue system
src/components/VeraDialogue.jsx      — draggable AI chat panel
src/components/DemoBanner.jsx        — amber demo banner + inline tier switcher
src/pages/DemoLogin.jsx              — demo login (/demo/login)
src/pages/BusinessSelector.jsx       — 10 business cards (/demo/select)
src/pages/TierSelector.jsx           — tier selection (/demo/tier/:businessId)
src/pages/DemoPortal.jsx             — demo portal shell (/demo/portal/:businessId/:tier)
src/pages/SalesPerformance.jsx       — aggregate rep dashboard (/demo/performance)
src/pages/Calendar.jsx               — Qerxel Calendar tab (react-big-calendar, DnD, appointment modal)
src/pages/Integrations.jsx           — Integrations tab (module framework, coming soon cards)
demo_seed.sql                        — demo data seed script (run in Supabase SQL Editor)
supabase_rls.sql                     — idempotent RLS script (safe to re-run)
supabase_migrations_session4.sql     — session 4+5 migrations (run in Supabase SQL Editor)
```

---

## API ENDPOINTS (Vercel serverless, /api/)

| File | Purpose |
|------|---------|
| api/vapi-webhook.js | Receives Vapi call events, writes call_logs + leads. Uses SUPABASE_SERVICE_ROLE_KEY. |
| api/vapi-sync.js | POST {tenantId} → builds prompt, PATCHes Vapi assistant. Uses VAPI_PRIVATE_KEY + SUPABASE_SERVICE_ROLE_KEY. |
| api/vapi-assistant-request.js | Handles Vapi real-time assistant-request events. |
| api/_build-prompt.js | Shared module — buildSystemPrompt() + buildAnalysisPlan(). Not a serverless function. |
| api/vera-chat.js | POST {zoneText, zoneName, tabName, messages} → Claude Haiku reply. Uses ANTHROPIC_API_KEY. |
| api/greeting-generator.js | Generates greeting message via Claude Haiku. |
| api/support-chat.js | POST {tenantId, messages} → Claude Haiku with live tenant context (plan, calls, leads, partners, settings). Wired to Account tab support chat UI. |
| api/scrape-website.js | POST {url} → Firecrawl scrape → Claude Haiku extraction of 8 business fields. Returns {fields, found}. Uses FIRECRAWL_API_KEY + ANTHROPIC_API_KEY. |
| api/notify-daily-cost.js | Daily cron (09:00 UTC via vercel.json). Sends cost report email to PAYG tenants who had calls today. Uses RESEND_API_KEY. |
| api/_emails.js | Shared email templates — emailDailyCost(). Not a serverless function. |
| api/owner-tenants.js | POST {email} → returns all tenants for owner preview dropdown. Email-gated server-side. Uses SUPABASE_SERVICE_ROLE_KEY. |
| api/stripe-checkout.js | POST {tenantId, targetTier} → creates Stripe Checkout session (new subs) or swaps price directly (existing subs). Returns {mode: 'redirect', url} or {mode: 'updated', tier}. |
| api/stripe-webhook.js | Stripe event handler (raw body, signature verified). Handles checkout.session.completed, subscription.updated, subscription.deleted. Updates tenants.tier + stripe IDs. |

### Environment vars (Vercel + local .env)

| Var | Used by |
|-----|---------|
| SUPABASE_SERVICE_ROLE_KEY | vapi-webhook.js, vapi-sync.js, owner-tenants.js |
| VAPI_PRIVATE_KEY | vapi-sync.js |
| ANTHROPIC_API_KEY | vera-chat.js, greeting-generator.js, support-chat.js, scrape-website.js |
| FIRECRAWL_API_KEY | scrape-website.js |
| RESEND_API_KEY | notify-daily-cost.js |
| STRIPE_SECRET_KEY | stripe-checkout.js, stripe-webhook.js |
| STRIPE_WEBHOOK_SECRET | stripe-webhook.js |
| STRIPE_PRICE_LIGHT | stripe-checkout.js, stripe-webhook.js |
| STRIPE_PRICE_STANDARD | stripe-checkout.js, stripe-webhook.js |
| STRIPE_PRICE_PROFESSIONAL | stripe-checkout.js, stripe-webhook.js |
| STRIPE_PRICE_ENTERPRISE | stripe-checkout.js, stripe-webhook.js |
| SITE_URL | stripe-checkout.js — success/cancel redirect base URL |

---

## PROMPT BUILDER (_build-prompt.js)

Two locked Layer 1 constants injected into every prompt (never editable by tenants):
- LAYER_1_CORE_VALUES — warmth and human presence mandate
- LAYER_1_JUDGEMENT — emergency/distress override, common sense escalation

buildSystemPrompt(data) builds:
1. Layer 1 values + judgement
2. Business identity, tone register (warm/formal), British English
3. Greeting (from greeting_message, or generated from tone/outcome type/callback pref)
4. "Please allow me" through-line (adjusts to tone and outcome type)
5. Business context (services, partner services, partner directory with phone numbers)
6. Call type rules — 5 types, each with mode guide + closing options
7. Filters (spam, sales, autodialler)
8. Emergency keywords (if set)
9. Additional instructions (if set)
10. Required outcome taxonomy — 7 triage_outcome values

Sensitive business type override: if isSensitive=true, replaces full prompt with confidentiality-only version (name + number + urgency only, no enquiry details).

buildAnalysisPlan() — sets Vapi summaryPrompt and structuredDataSchema for post-call extraction of: triage_outcome (enum 7 values), caller_name, referred_to.

---

## PORTAL STRUCTURE — ALL 6 TABS BUILT

Portal shell: 64px violet header (#5e3b87, logo left, email+signout right) → 44px dark violet nav strip (#4a2d6e, amber underline on active) → #f7f6f9 content area, maxWidth 940px, padding 2rem.

Default tab on login: Dashboard

HelpMascot rendered at top of every tab. Receives tenantId + businessName from Portal.jsx via TAB_CONTEXT map.

**Owner preview mode:** is_owner accounts see a tenant dropdown in the portal header. Selecting a tenant enters preview via PreviewContext. Amber "Previewing: [name]" banner when active with Exit button. All 6 tabs use `previewTenantId` for fetches when `isPreview` is true. All save/mutate guards: `if (isDemo || isPreview || !tenantId) return`.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | BUILT |
| AI Behaviour | AIBehaviour.jsx | BUILT + Vapi sync wired |
| Dashboard | ActivityDashboard.jsx | BUILT, confirmed end-to-end |
| Analytics | DataAnalytics.jsx | BUILT |
| Partners & Referrals | PartnersReferrals.jsx | BUILT |
| Calendar | Calendar.jsx | BUILT — Session 1 complete |
| Integrations | Integrations.jsx | BUILT — framework + coming soon cards |
| Account | AccountSettings.jsx | BUILT |

---

## TAB DETAIL — BUSINESS PROFILE

Five sections:
1. Business Details — name, phone, email, booking link, address, opening hours, business context → tenants
2. Your Services — chip list → services table
3. Partner Services — chip list of referred-out services → banned_services table
4. Client Directory — known clients with specialist instructions. Light: 20, Standard: 50, Professional/Enterprise: 200. → callers + caller_tenant_relationships. Quota bar with amber warning.
5. Employee Profiles — Enterprise only. → staff_profiles

---

## TAB DETAIL — AI BEHAVIOUR

Six sections:
1. Call Handling (global) — triage_mode (Strict/Balanced/Open), escalation_preference, overage_voice_preference (Premium/Standard radio — paid subscription tiers only) → tenants
2. Call Type Rules — 5 call type cards. Each: mode selector, booking link/callback/email/goodbye toggles, email address, additional instructions. → call_handling_rules upsert
3. Emergency Keywords — chip list → tenants.emergency_keywords (text[])
4. Greeting Message — custom or system default → tenants.greeting_message
5. Call Filtering — spam detection, sales call handling, autodialler detection → tenants
6. Number Blocking — Light: locked. Standard+: coming soon

Additional fields: tone_register, business_outcome_type, callback_preference_note, additional_instructions → tenants

On every save: calls /api/vapi-sync with tenantId to push live config to Vapi.

---

## TAB DETAIL — DASHBOARD

4 stat cards: Calls today, New leads (7 days), Referrals sent (7 days), Minutes used this month.
Recommendation card — 4 priority states: actionable leads → minutes running low → no calls yet → healthy.
Recent calls feed — last 8, caller name/number, time, duration, AI summary, outcome badge.
Two-column: Leads requiring action (status=new) + Referrals sent today.

Dashboard reads:
- call_logs: id, created_at, duration_seconds, ai_summary, call_outcome, caller_phone, callers(phone_number, full_name)
- leads: id, created_at, status, lead_contact_name, callers(phone_number)
- referral_log: id, created_at, referral_partners(business_name)

Call outcome badge values: booked, lead_captured, referred_out, filtered, escalated, hard_close, spam

---

## TAB DETAIL — ANALYTICS

3 headline numbers: Total calls, Lead capture rate %, Avg call duration.
Recommendation card — context-aware per tier and data state.
4 tier-gated feature cards (Enterprise unlocks all):
- Pricing Intelligence (blurred preview on non-Enterprise)
- Call Outcome Breakdown (live bar chart for Enterprise)
- Caller Patterns (live day-of-week bar chart for Enterprise)
- Competitor Intelligence (blurred preview on non-Enterprise)

Analytics reads:
- call_logs: id, created_at, duration, triage_outcome (note: `duration` not `duration_seconds`)
- leads: id
- tenants: subscription_tier

---

## TAB DETAIL — PARTNERS & REFERRALS

STRATEGIC DECISION — LOCKED: Partner network is unlimited at ALL tiers.

Sections:
- Partner Network — unlimited all tiers. → referral_partners + referral_service_map
- Referral Code — Syne display, copy button, QR via api.qrserver.com
- Credits — balance in months. 1 referral = 1 free month, stackable → tenant_credits
- Network Activity — outbound count + £ estimated value (£75/referral)

---

## TAB DETAIL — ACCOUNT

- Plan & Billing — tier badge, billing model (subscription/PAYG), upgrade cards (Stripe not wired — placeholder buttons). PAYG tenants: editable monthly cost limit field.
- Account Details — business name (editable), email (read-only), password reset
- Notifications — 3 toggles: new lead, daily summary, weekly report → tenants columns
- Privacy & Data — retention selector (30d/90d/1yr) → tenants.data_retention_days. Export placeholder. Two-stage delete modal. Policy links.
- Feedback — time-gated at 42 days from tenant creation → tenant_feedback
- Support chat — LIVE. Wired to /api/support-chat (Claude Haiku with live tenant context: plan, calls, leads, partners, settings).
- Cancel flow — two-stage retention modal showing personalised loss

---

## TAB DETAIL — CALENDAR

**Standalone product** — Calendar.jsx exists independently of AI call handling. Neither depends on the other. Save guards: `if (isDemo || isPreview || !tenantId) return`.

react-big-calendar + date-fns-localizer + DnDCalendar addon. UK locale (Monday week start).

Views: month / week / day. Drag-and-drop reschedule + resize writes to Supabase immediately.

Appointment statuses + colours:
- provisional → amber (#fef3d9 / #f0a500)
- confirmed → violet (#ede8f5 / #5e3b87)
- completed → green (#e6f9ef / #3db87a)
- cancelled → grey
- no_show → red

Modal fields: title (required), start/end datetime (required), status, service type, client notes, description.
Slot-too-small warning fires when selected slot < 30 min — warns, does not block (per spec).

Appointments belong to staff_profiles (staff_profile_id FK) — this is the critical design decision that makes it scale from solo to Enterprise without architectural changes.

**Calendar DB tables:** appointments, staff_availability — RLS enabled, policies in supabase_migrations_session4.sql.

**Upcoming sessions:**
- Session 2: split appointments (processing_start_time / processing_end_time), team mode multi-column
- Session 3: CalDAV external sync
- Session 4: Enterprise manager views + permissions
- Session 5: customer booking page (public URL)

---

## TAB DETAIL — INTEGRATIONS

Framework only — no live integrations yet. All 19 defined as `status: 'coming_soon'`.

Architecture: each integration is a self-contained object in the INTEGRATIONS array in Integrations.jsx. To activate: set `status: 'available'` and add an `onConnect` handler. No architectural changes needed.

Category filter: All / Calendar / Messaging / Accounting / Reviews / Field Service / Payments / Booking / CRM / Automation.

Priority 1 (build first): Google Calendar, Google Business Profile, WhatsApp Business, FreeAgent, Xero.
Priority 2: Jobber, ServiceM8, Stripe Payments, SumUp, Checkatrade, Booksy, Acuity Scheduling, Pipedrive, Capsule CRM, GoCardless.
Priority 3: Zapier, HubSpot, QuickBooks.
Do not build: Notion, Sage, Slack, Mailchimp.

---

## VERA HELP MASCOT — FULL SYSTEM

### HelpMascot.jsx
Props: { contextKey, tenantId, activeTab, businessName }

Three modes:
- **Hover mode** — click Vera (violet owl, 44×72px) to toggle. Hover any [data-help] element → FloatingBubble.
- **Need more help mode** — draws amber glowing overlay on all [data-help] zones. Click zone → VeraDialogue panel.
- **Proactive speech** — checks vera_speeches on tab load. Shows once per tenant lifetime (vera_seen).

Label: "Click on Vera the owl / for suggestions" — 12px, #5e3b87, italic, two lines, right of owl with gap.

### VeraDialogue.jsx
340×420px draggable panel. Calls /api/vera-chat (Claude Haiku). Enter to send.

### data-help coverage — COMPLETE
All 6 tabs have data-help on every section heading and key UI element.

---

## DEMO SYSTEM — FULLY BUILT

### Flow
`/demo/login` → `/demo/select` → `/demo/tier/:businessId` → `/demo/portal/:businessId/:tier`

Side route: `/demo/performance` (aggregate stats, accessible from BusinessSelector)

### Auth
No Supabase auth. `DemoLogin.jsx` checks `demo_users` table (email + access_code). On success stores `{ id, email, name, role }` in `localStorage('demo_session')`. All demo routes guarded by `DemoRoute` component in App.jsx that checks localStorage.

### DemoContext.jsx
Central provider mounted by DemoPortal. Fetches in parallel:
- `demo_businesses` → `business`
- `demo_call_logs` → `calls` (shaped with `callers` join structure for ActivityDashboard)
- `demo_leads` → `leads` (shaped with `lead_contact_name` + `callers` structure)
- `demo_referral_log` → `referrals` (shaped with `referral_partners` join structure)
- `demo_services` → `services` (split by `is_partner_service` boolean in each tab)
- `demo_staff` → `staff`
- `demo_partners` → `partners` (columns: `partner_name`, `partner_phone`, `specialty`)

Also exposes `analyticsCallData` — calls with `duration` = `duration_seconds` for DataAnalytics compatibility.

### Tab wiring pattern (all 6 tabs)
Every tab imports `useDemo` and adds two useEffects:
```js
const demo = useDemo()
const isDemo = !!demo?.isDemo

// Demo injection (fires when demo data loads)
useEffect(() => {
  if (!isDemo || demo?.loading) return
  // set state from demo.*
  setLoading(false)
}, [isDemo, demo?.loading])

// Real fetch (skipped in demo)
useEffect(() => {
  if (isDemo || !user) return
  // existing Supabase fetch
}, [user, isDemo])
```

All save/mutate functions guard with `if (isDemo || !tenantId) return` — silently no-op in demo.

### DemoPortal.jsx
Same shell as Portal.jsx (header, nav, content). DemoBanner sits above the header. Renders all 6 real tab components — they read from DemoContext rather than Supabase. Inserts a `demo_sessions` row on mount (user_id from localStorage, business_id + tier from URL params).

### DemoBanner.jsx
40px amber (#f0a500) strip above the portal header. Left: "Demo · [Business Name]". Right: inline tier switcher — 4 buttons (Light / Standard / Professional / Enterprise). Active tier highlighted. Clicking a tier navigates to `/demo/portal/:id/:newTier` with `replace: true` — instant, no page reload feel.

### TierSelector.jsx
4 tier cards showing price, concurrent calls, minutes, features. Business's own tier flagged "Demo data". Any tier selectable regardless — sales rep can show any tier experience against any business's data.

### SalesPerformance.jsx (`/demo/performance`)
Aggregate stats across all 10 demo businesses: total calls, leads, referrals, converted leads, avg duration, total minutes, revenue protected (£75/lead). Tier breakdown bar chart. Business list clickable to TierSelector. Accessible via "Platform overview →" button on BusinessSelector.

---

## VISUAL LANGUAGE — LOCKED

All inline styles — no CSS files. No CSS variables.

| Token | Value | Usage |
|-------|-------|-------|
| Violet primary | #5e3b87 | Header, borders, active states |
| Violet dark | #4a2d6e | Nav strip |
| Violet deep | #3a2057 | Gradient ends |
| Amber | #f0a500 | Active tab, CTAs, stat numbers, demo banner |
| Amber light | #fef3d9 | Chip backgrounds |
| Amber dark | #b07a00 | Amber on light bg |
| Page bg | #f7f6f9 | Portal body |
| Card white | #ffffff | All cards |
| Card border | 0.5px solid rgba(94,59,135,0.1) | All cards |
| Success | #3db87a | Active indicators |
| Text | #1a1a1a | Body |
| Text secondary | #666 | Meta |
| Text tertiary | #aaa | Labels |

Fonts: Syne 700 (headings/logo/stat numbers). DM Sans 300/400/500 (body/UI). Google Fonts in index.html.
Primary button: #f0a500 bg, #1a0533 text, borderRadius 8px.
Disabled button: #f5d98a bg, #7a5c1a text.
Secondary button: white bg, violet border, violet text.
Locked sections: blur(3px) + opacity 0.45 + absolute white badge.
Logo: "Qerxel" Syne 700 + 7px amber dot (marginLeft 3, marginBottom 8).

---

## ONBOARDING FLOW

Onboarding.jsx — 8 steps:
0. Your website — URL input + Firecrawl scan (api/scrape-website.js) → pre-populates business_name, phone, email, address, hours, contact, context, services. "No website? No problem." skip path.
1. Business type
2. About your business
3. Your services
4. Your boundaries
5. Your partners
6. Choose your plan — subscription (tier selector, first month free note) or PAYG (cost limit input, minutes-per-pound calculation)
7. Review & launch

On submit: creates tenant row (with billing_model, tier, monthly_cost_limit), inserts services, inserts referral_partners, creates tenant_memberships.

Guards (both directions): Portal → /onboarding if no membership. Onboarding → /portal if membership exists.

---

## CURRENT BUILD STATE

### Done — portal + infrastructure
- All 6 portal tabs built and wired to Supabase
- Auth guards bidirectional
- Vapi webhook + sync confirmed end-to-end
- System prompt builder (Layer 1–3)
- Vera mascot full system
- GDPR Privacy & Data section in Account tab
- RLS enabled on all production tables
- Tier structure: Light/Standard/Professional/Enterprise/Bespoke

### Done — demo system (2026-06-05)
- 10 demo businesses seeded across all tiers, ~480 call logs, 50 leads, 40 referral entries
- Pricing + competitor intelligence for Restore Physiotherapy (Enterprise)
- `/demo/login` — checks demo_users, stores session in localStorage
- `/demo/select` — BusinessSelector with tier badges, "Platform overview" link
- `/demo/tier/:id` — TierSelector, any tier previewed against any business
- `/demo/portal/:id/:tier` — DemoPortal, all 6 tabs live with demo data
- `/demo/performance` — SalesPerformance aggregate stats
- DemoBanner with inline tier switcher (no page reload)
- All 6 tabs wired: useDemo() + isDemo guards on all saves
- demo_sessions tracking on every portal mount

### Done — billing model + onboarding enhancements (2026-06-05)
- Free tier (PAYG £0.35/min) added throughout portal and onboarding
- Subscription tier minutes updated: Light 120, Standard 250, Professional 450, Enterprise 1,000
- Overage voice preference control (Premium 18p/Standard 14p) in AI Behaviour — stored in tenants.overage_voice_preference
- Daily cost report email for PAYG tenants (api/notify-daily-cost.js, Resend, vercel.json cron 09:00 UTC)
- PAYG cost limit check in vapi-webhook.js after each call
- Website scraping step 0 in onboarding (Firecrawl + Claude Haiku, api/scrape-website.js)
- Plan selection step 6 in onboarding (subscription or PAYG with cost limit)

### Done — owner preview + support chat (2026-06-05)
- Owner preview mode: PreviewContext.jsx, Portal.jsx dropdown + amber banner, all 6 tabs wired, api/owner-tenants.js
- Support chat: api/support-chat.js (Claude Haiku + live tenant context), AccountSettings.jsx wired

### Done — Stripe billing (2026-06-05)
- api/stripe-checkout.js — POST {tenantId, targetTier}: Checkout session for new subs, direct price swap for existing subs
- api/stripe-webhook.js — checkout.session.completed, subscription.updated, subscription.deleted. Raw body + signature verification.
- AccountSettings.jsx — Upgrade buttons wired, loading state, green success banner, ?upgraded=1 URL detection
- Portal.jsx — defaults to Account tab on return from Stripe (?upgraded=1)
- New DB columns: tenants.stripe_customer_id, tenants.stripe_subscription_id
- Setup required: Stripe products/prices, webhook endpoint in Stripe Dashboard, 7 new Vercel env vars (see Environment vars section)

### Done — Integrations tab (2026-06-05)
- src/pages/Integrations.jsx — full module framework: category filter, coming-soon cards, connected/available/coming-soon sections
- 19 integrations defined across Priority 1/2/3 (all currently 'coming_soon')
- Architecture: each integration is a self-contained object — add status: 'available' + connect handler to activate
- Wired into Portal.jsx nav

### Done — Qerxel Calendar Session 1 (2026-06-05)
- src/pages/Calendar.jsx — standalone product tab
- react-big-calendar + date-fns-localizer, DnD addon
- Day / week / month views with UK locale (Monday start)
- Manual appointment creation — modal with title, start/end, status, service type, client notes, description
- Slot-too-small warning (< 30 min) — warns, does not block
- Status colour coding: provisional (amber), confirmed (violet), completed (green), cancelled (grey), no-show (red)
- Drag-and-drop reschedule + resize — writes to Supabase on drop
- Click existing event to edit or delete
- Demo mode: seeded with 5 sample appointments (no Supabase reads)
- Owner preview mode: read-only (all save/delete guards honour isPreview)
- New DB tables: appointments, staff_availability (+ RLS policies in supabase_migrations_session4.sql)
- Wired into Portal.jsx nav

### DB migrations pending (run supabase_migrations_session4.sql)
All columns and tables from this session are in `supabase_migrations_session4.sql`. Run in Supabase SQL Editor before testing Stripe or Calendar.

### Remaining
- [ ] Calendar Session 2 — split appointments (processing time blocks, team mode, multi-column)
- [ ] Calendar Session 3 — CalDAV external sync (Google, Apple, Outlook)
- [ ] Calendar Session 4 — Enterprise mode (manager views, permissions)
- [ ] Calendar Session 5 — customer booking page (public URL, self-book)
- [ ] Task 1 — Staff extension recognition (Enterprise, direct_line_did per staff member)
- [ ] Integration builds — Priority 1: Google Calendar, Google Business Profile, WhatsApp Business, FreeAgent, Xero
- [ ] Phone line feature — behind VITE_PHONE_LINE_ENABLED=false, waiting on partner contract
- [ ] Public Playground — Cartesia Sonic 3.5 live generation, 8 languages

---

## CODE CONVENTIONS

- All `.single()` replaced with `.maybeSingle()` — prevents 406 errors on 0 rows
- All Supabase queries wrapped in try/catch with finally { setLoading(false) }
- Tab components receive onNavigate prop for cross-tab navigation
- Tier checks: `isEnterprise = ['enterprise','bespoke'].includes(tier)`
- Client limit: `CLIENT_LIMIT = { light: 20, standard: 50, professional: 200, enterprise: 200, bespoke: 200 }`
- No CSS files — all inline styles
- data-help on all section headings and key UI elements (Vera reads these)
- Supabase anon key safe in frontend. Service role key NEVER in frontend — server only.
- Demo tables prefixed `demo_`. Never join demo_ tables to production tables.
- Demo pattern: `const demo = useDemo(); const isDemo = !!demo?.isDemo` at top of every tab. Two useEffects — one for demo injection, one for real fetch, both gated.
- Save guard pattern (all 6 tabs): `if (isDemo || isPreview || !tenantId) return` — silently no-ops in both demo and owner preview.

---

## PARKED FEATURES — CONFIRMED SPEC, NOT YET BUILT

**Call sample recordings:** 15 pre-recorded MP3s (5 call types × 3 modes). Hover mode selector in AI Behaviour → "Listen to a Strict call". Generate with ElevenLabs.

**Public Playground:** Standalone, no auth. Language × dialect → voice sample. 40 pre-rendered MP3s.

**Referred signup surface:** ?ref=TENANTCODE page, captures referred_by_tenant_id.

---

## FUTURE TASKS — PARKED

- get_vapi_context PostgreSQL function (SQL written, not deployed)
- VIP caller context injection — client directory UI built, Vapi routing logic pending
- Staff specialist routing — UI built, Vapi routing logic pending
- Twilio SMS integration
- Weekly/monthly email reports
- Number blocking — table exists, UI placeholder built, logic pending
- CSV import for existing client data
- n8n migration at 30 tenants
- Pricing intelligence coaching feature
- Multi-site and franchise architecture (post revenue)
- Domain confirmation (qerxel.com placeholder)
- Terms of service document

---

## PRACTICAL NOTES

- Dev server: two separate commands — `cd C:\Users\philo\qerxel-portal` then `npm run dev`
- PowerShell does not support && — always two separate commands or use Bash tool
- F12 hijacked by ASUS — use Ctrl+Shift+I or right-click Inspect
- Vercel auto-deploys on git push to master
- Hot reload active — file saves go straight to browser
- SQL Editor in Supabase: run, confirm success, close tab
- demo_seed.sql is safe to re-run — truncates before reseeding
- vercel.json has daily cron for /api/notify-daily-cost (09:00 UTC) — PAYG cost report emails
