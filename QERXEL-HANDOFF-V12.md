# QERXEL — COMPLETE PROJECT HANDOFF
## Read this at the start of every new conversation thread.
## Last updated: 2026-06-08 (session 16)

---

## WHAT QERXEL IS

AI call handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers out-of-scope callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

Working name. Not legally confirmed yet.
Core sales framing — LOCKED: **"Never miss another lead."**
Scale intent: 500 tenants before any tech hires. All development via Claude Code.

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator. Uses Claude Code (VSCode extension) for all development.

Dev environment: **Windows 11, VSCode, PowerShell.** F12 hijacked by ASUS — uses Ctrl+Shift+I. **PowerShell does not support `&&` — always two separate commands.**

---

## TIER STRUCTURE

| Tier | Price | Concurrent | Minutes | Referrals |
|------|-------|-----------|---------|-----------|
| Free | £0 (PAYG £0.35/min) | 1 | 0 (PAYG) | Yes |
| Light | £29/month | 1 | 120 | Yes |
| Standard | £49/month | 1 | 250 | Yes |
| Professional | £69/month | 2 | 450 | Yes |
| Enterprise | £249/month | 3+ | 1,000 | No cap |
| Bespoke | Contact us | Custom | Custom | Negotiated |

Overage (subscription): Premium voice **£0.18/min** · Standard voice **£0.14/min**
PAYG: flat **£0.35/min**. Spam/autodialler filtered calls: **always free** on all tiers.
Enterprise has NO referral network cap.

**Voice tiers:**
- Premium: Cartesia Sonic 3.5 + GPT-4o mini
- Standard: Cartesia Sonic 3 + Gemini Flash
- STT: Deepgram Nova-2. Non-negotiable.

**Tier checks in code — always use this pattern:**
```javascript
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

---

## TECH STACK

| Component | Technology |
|-----------|------------|
| Telephony | Vapi (BYOK pricing) |
| STT | Deepgram Nova-2 |
| LLM | Gemini Flash (Standard) / GPT-4o mini (Premium) |
| TTS | Cartesia Sonic 3 (Standard) / Cartesia Sonic 3.5 (Premium) |
| Database | Supabase (PostgreSQL) |
| Automation | Make.com → n8n at 30 tenants |
| Frontend | React/Vite → Vercel (manual deploy — see Practical Notes) |
| SMS | Twilio |
| Email | Resend (transactional — daily cost reports, minute alerts) |
| Payments | Stripe (wired, needs setup) |
| Website scraping | Firecrawl (onboarding) |
| Calendar | react-big-calendar + date-fns |
| Vera AI | Claude Haiku (vera-chat, greeting-generator, support-chat, scrape-website) |

---

## SUPABASE

Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co

Anon key (HS256 — use this, NOT sb_publishable_):
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ`

GitHub: https://github.com/philsk1/verante-portal
Live URL: https://verrante-portal.vercel.app

**RLS:** Enabled on all production tables. Script: `supabase_rls.sql` (idempotent).
Helper: `is_tenant_member(tid)`. HS256 anon key works with `auth.uid()`.
**NEVER switch to ES256 `sb_publishable_` key** — PostgREST cannot validate ES256, auth.uid() returns null.
Vapi webhook + owner-tenants.js use service_role key (bypass RLS). Correct.
Demo tables (demo_*): no RLS — public read.

---

## DATABASE

### Production tables (all live, RLS enabled)
business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules, catalogue_items, appointments, staff_availability, tenant_integrations, tenant_integration_credentials, vera_speeches, vera_seen

### Demo tables (no RLS — public read)
demo_businesses, demo_services, demo_staff, demo_partners, demo_call_logs, demo_leads, demo_referral_log, demo_pricing_intelligence, demo_competitor_intelligence, demo_users, demo_sessions

Seed script: `demo_seed.sql` — safe to re-run.

### Key columns on tenants
```
business_name, business_email, business_phone, lead_contact_name,
booking_link, opening_hours, business_context, triage_mode,
escalation_preference, greeting_message, spam_filter_enabled,
sales_call_handling, autodialler_detection, emergency_keywords (text[]),
tone_register, business_outcome_type, callback_preference_note,
urgent_callback_mins, additional_instructions, vapi_assistant_id,
tier, data_retention_days (default 90),
billing_model (subscription|payg), monthly_cost_limit (decimal, default 20),
overage_voice_preference (premium|standard, default premium),
stripe_customer_id, stripe_subscription_id,
vapi_phone_number_id, vapi_phone_number,
call_recording_enabled (boolean, default false),
phone_line_provider, phone_line_status, phone_line_number,
phone_line_monthly_cost (decimal, default 8.00), phone_line_partner_ref,
listen_tier (text, default 'none'), calendar_tier (text, default 'entry')
```

### Key columns on staff_profiles
```
tenant_id, name, role, phone, email, address, birthday, colour (text),
specialist_services (text[]), direct_line_did (text), private_notes
```

### referral_partners — important column names
`partner_name` (not business_name), `contact_phone` (not business_phone).
In `_build-prompt.js`, normalise with spread: `{ ...p, business_name: p.partner_name, business_phone: p.contact_phone }`.

### banned_services — important column names
`banned_item` (not service_name).
Load normalisation: `(data || []).map(b => ({ ...b, service_name: b.banned_item }))`.

### referral_service_map — important column names
`service_keyword` (not service_name).

### vera_speeches table columns
`id, context_key, speech_text, audio_url, created_at, updated_at`
Context keys: dashboard.first_visit, profile.first_visit, ai_behaviour.first_visit,
analytics.first_visit, referrals.first_visit, listen.first_visit, account.first_visit

### profiles table
`id (= auth.uid()), email, is_owner` — set `is_owner = true` for finsolsoffice@gmail.com to enable owner preview mode.

---

## DEMO BUSINESSES — FIXED IDs

| UUID suffix | Business | Tier |
|-------------|----------|------|
| ...000000000001 | Hargreaves Plumbing | standard |
| ...000000000002 | Elegant Hair Design | professional |
| ...000000000003 | Greenfield Landscape Gardening | light |
| ...000000000004 | Swift Electrical | standard |
| ...000000000005 | Paws & Claws Dog Grooming | light |
| ...000000000006 | Premier Mortgage Solutions | standard |
| ...000000000007 | Valley View B&B | professional |
| ...000000000008 | Apex Print & Design | standard |
| ...000000000009 | Nationwide Recruitment | light |
| ...000000000010 | JB Sports & Fashion | enterprise |

Full UUID pattern: `00000000-0000-0000-0000-00000000000X`

**Demo access:** `demo@qerxel.app` / `QERXEL2026` → `/demo/login`
**Owner/founder access:** `finsolsoffice@gmail.com` / `Liverpool1!` → regular portal with owner preview dropdown

---

## KEY FILES

```
src/supabase.js                      — HS256 anon key (hardcoded, correct)
src/context/AuthContext.jsx          — Supabase auth session
src/context/DemoContext.jsx          — demo data provider; all tabs check useDemo()
src/context/PreviewContext.jsx       — enterPreview/exitPreview/isPreview (owner mode)
src/App.jsx                          — routes, PreviewProvider wraps all routes
src/pages/Portal.jsx                 — shell, nav, 9-tab routing, owner dropdown
src/pages/BusinessProfile.jsx
src/pages/AIBehaviour.jsx
src/pages/ActivityDashboard.jsx      — default tab
src/pages/DataAnalytics.jsx
src/pages/PartnersReferrals.jsx
src/pages/ListenTab.jsx              — transcript archive, two-panel, cross-tab prefill
src/pages/StaffDirectory.jsx         — team tab, card grid + slide-in panel, tag picker
src/pages/AccountSettings.jsx
src/pages/Calendar.jsx               — Qerxel Calendar (standalone product tab)
src/pages/Integrations.jsx           — Integrations tab (module framework)
src/pages/Onboarding.jsx             — 8-step onboarding with website scraping
src/pages/Login.jsx, Signup.jsx
src/pages/DemoLogin.jsx              — /demo/login
src/pages/BusinessSelector.jsx       — /demo/select
src/pages/TierSelector.jsx           — /demo/tier/:id
src/pages/DemoPortal.jsx             — /demo/portal/:id/:tier
src/pages/SalesPerformance.jsx       — /demo/performance
src/pages/PlanSelector.jsx           — /plans (pick-and-mix configurator)
src/components/HelpMascot.jsx        — Vera owl + hover/zone/dialogue system
src/components/VeraDialogue.jsx      — draggable Claude Haiku chat panel
src/components/DemoBanner.jsx        — amber banner + inline tier switcher
api/vapi-webhook.js                  — end-of-call handler (service role)
api/vapi-sync.js                     — patches Vapi assistant on AI Behaviour save
api/vapi-assistant-request.js        — Vapi real-time assistant-request handler
api/_build-prompt.js                 — system prompt builder (Layer 1–3)
api/vera-chat.js                     — Vera dialogue (Claude Haiku)
api/greeting-generator.js            — greeting generator (Claude Haiku)
api/support-chat.js                  — Account tab support chat (Claude Haiku + tenant context)
api/scrape-website.js                — onboarding website scan (Firecrawl + Claude Haiku)
api/notify-daily-cost.js             — PAYG daily cost report cron (Resend)
api/_emails.js                       — shared email templates
api/owner-tenants.js                 — tenant list for owner preview dropdown (service role)
api/stripe-checkout.js               — Stripe Checkout session / direct subscription swap
api/stripe-webhook.js                — Stripe event handler (signature verified, raw body)
api/remind-appointments.js           — hourly cron, 24h + 1h appointment reminders (Resend)
api/integrations-connect.js          — stores credentials (service role) + settings
api/integrations-disconnect.js       — removes integration + credentials
api/whatsapp-send.js                 — sends WhatsApp via Meta Cloud API
api/freeagent-auth.js / callback / invoice — FreeAgent OAuth + invoice creation
api/xero-auth.js / callback / invoice       — Xero OAuth + invoice creation
api/caldav-sync.js                   — CalDAV push on every Calendar save/delete
api/send-review-request.js           — review request on appointment completion
api/stripe-payment-link.js           — ad-hoc Stripe Checkout from any lead
api/zapier-webhook.js                — outbound Zapier webhook on lead_captured
supabase_rls.sql                     — idempotent RLS script (safe to re-run)
demo_seed.sql                        — demo data seed (safe to re-run)
vercel.json                          — rewrites + cron jobs
```

---

## API ENDPOINTS

| Endpoint | Purpose |
|----------|---------|
| api/vapi-webhook.js | Vapi end-of-call events → call_logs + leads. Service role. |
| api/vapi-sync.js | POST {tenantId} → builds prompt, PATCHes Vapi assistant. |
| api/vapi-assistant-request.js | Vapi real-time assistant-request handler. |
| api/_build-prompt.js | buildSystemPrompt() + buildAnalysisPlan(). Shared module. |
| api/vera-chat.js | POST {zoneText, zoneName, tabName, messages} → Claude Haiku. |
| api/greeting-generator.js | Greeting generator — Claude Haiku. |
| api/support-chat.js | POST {tenantId, messages} → Claude Haiku with live tenant context. |
| api/scrape-website.js | POST {url} → Firecrawl + Claude Haiku → {fields, found}. |
| api/notify-daily-cost.js | Daily cron 09:00 UTC — PAYG cost report. |
| api/owner-tenants.js | POST {email} → all tenants for owner preview. Email-gated. Service role. |
| api/stripe-checkout.js | POST {tenantId, targetTier} → Checkout URL or direct swap. |
| api/stripe-webhook.js | checkout.session.completed, subscription.updated/deleted. Raw body + sig. |
| api/remind-appointments.js | Hourly cron. 24h + 1h windows. Resend email. |
| api/caldav-sync.js | POST {tenantId, appointmentId, action} → CalDAV push. |
| api/send-review-request.js | POST {tenantId, appointmentId, integrationId} → review request. |
| api/stripe-payment-link.js | POST {tenantId, leadId, amountPounds, description} → ad-hoc Checkout. |
| api/zapier-webhook.js | POST {tenantId, event, payload} → Zapier outbound webhook. |

### Environment variables (Vercel + local .env)

| Variable | Used by |
|----------|---------|
| SUPABASE_SERVICE_ROLE_KEY | vapi-webhook, vapi-sync, owner-tenants, stripe-webhook |
| VAPI_PRIVATE_KEY | vapi-sync |
| ANTHROPIC_API_KEY | vera-chat, greeting-generator, support-chat, scrape-website |
| FIRECRAWL_API_KEY | scrape-website |
| RESEND_API_KEY | notify-daily-cost |
| STRIPE_SECRET_KEY | stripe-checkout, stripe-webhook |
| STRIPE_WEBHOOK_SECRET | stripe-webhook |
| STRIPE_PRICE_LIGHT/STANDARD/PROFESSIONAL/ENTERPRISE | stripe-checkout, stripe-webhook |
| SITE_URL | stripe-checkout, freeagent-auth/callback, whatsapp-send |
| FREEAGENT_CLIENT_ID / SECRET | freeagent-auth, freeagent-callback |
| XERO_CLIENT_ID / SECRET | xero-auth, xero-callback, xero-invoice |

---

## PORTAL STRUCTURE — 9 TABS

**Shell:** 260px violet left sidebar, collapsible to 60px icon-only. Right-edge 24px circular toggle. Business name at bottom (hidden when collapsed). Vera owl trigger. Active tab: amber left border + white bg tint. 0.22s smooth transition. Mobile: sidebar hidden, fixed bottom nav 5 items (Dashboard, Calendar, AI, Analytics, Account). Content area: full-width, `#f7f6f9` bg, 2rem padding. Default tab: Dashboard.

| Tab | File | Notes |
|-----|------|-------|
| Business Profile | BusinessProfile.jsx | Not in sidebar — accessed via nav only |
| AI Behaviour | AIBehaviour.jsx | Vapi sync on save. Status hero at top. |
| Dashboard | ActivityDashboard.jsx | Default tab. Full redesign. Cross-tab nav to Listen. |
| Analytics | DataAnalytics.jsx | Reads `duration` (not duration_seconds). Reads `triage_outcome`. |
| Partners & Referrals | PartnersReferrals.jsx | Network unlimited at all tiers. LOCKED. |
| Listen | ListenTab.jsx | Transcript archive. Two-panel. Cross-tab prefill from Dashboard. |
| Team | StaffDirectory.jsx | Card grid + slide-in panel. Structured tag picker for specialist_services. |
| Calendar | Calendar.jsx | Standalone product. react-big-calendar + DnD. |
| Integrations | Integrations.jsx | 9 live integrations + 10 coming soon. |
| Account | AccountSettings.jsx | Support chat, billing, GDPR, holiday mode. |

**Owner preview mode:** `profiles.is_owner = true` → tenant dropdown in header → PreviewContext → amber banner, all tabs use previewTenantId, all saves blocked. `api/owner-tenants.js` (service role, email-gated).

**Save guard on all tabs:** `if (isDemo || isPreview || !tenantId) return`

---

## TAB DETAILS — KEY FACTS

**Dashboard (`ActivityDashboard.jsx`):**
- call_outcome badge values: booked, lead_captured, referred_out, filtered, escalated, hard_close, spam
- Reads `duration_seconds` (NOT duration)
- Zone 1: AI status bar (ArcGauge, triage pill, north star count)
- Zone 2: 3-column — Calls / Leads / Referrals Today
- Zone 3: ApexCharts (donut lead rate, spark bar 7-day, area line 30-day minutes)
- Lead modal: 4 sections (AI summary / details / notes / history). "View transcript" button links to Listen tab if `call_log_id` present.
- Cross-tab: `onNavigate('listen', { callId: lead.call_log_id })` from lead modal

**Analytics (`DataAnalytics.jsx`):**
- Reads `duration` (NOT duration_seconds). Reads `triage_outcome` (NOT call_outcome).

**Listen (`ListenTab.jsx`):**
- Props: `{ prefill, onPrefillConsumed }`
- Status bar: "AI standing by" green dot + total call count
- Filter pills: All / Lead captured / Booked / Referred / Urgent / Filtered
- Two-panel: 300px scrollable call list left, transcript detail panel right
- `parseTranscript(raw)` — splits "Speaker: text" newlines into `{speaker, text}` bubble array
- Chat bubbles: AI (grey, left), User (violet, right)
- Auto-selects call matching `prefill.callId` on mount
- Demo mode uses `demo.calls`; real mode fetches `call_logs` with `transcript` column

**Team (`StaffDirectory.jsx`):**
- `specialist_services` is `text[]` in DB. `normaliseSpecs(val)` converts string or array.
- Catalogue items from `catalogue_items` table become violet chip selectors.
- Custom skills entered via Enter key → green dismissable tags.
- Save: `specialist_services: arr.length > 0 ? arr : null`

**Calendar (standalone product — never couple to AI call handling):**
- react-big-calendar + date-fns-localizer + DnD addon. UK locale (Mon start).
- Appointments belong to `staff_profile_id` (FK → staff_profiles). Not tenant_id directly.
- Solo/Team mode. Split appointments (duration_minutes + processing_minutes).
- CalDAV push on save/delete via `api/caldav-sync.js`.
- Cross-tab prefill from Dashboard: `calendarPrefill` state in Portal.jsx.

**AI Behaviour (`AIBehaviour.jsx`):**
- Overage voice preference radio (Premium 18p / Standard 14p). Paid tiers only.
- Status hero at top — live/mode/tone/outcome badges.
- Vapi sync on every save.

**Partners & Referrals:**
- `referral_partners` real columns: `partner_name`, `contact_phone`
- `referral_service_map` real column: `service_keyword`
- Partner network unlimited at ALL tiers — LOCKED.

**Account:**
- Support chat live → `api/support-chat.js`.
- GDPR: retention selector, export placeholder, two-stage delete modal.
- Stripe billing: upgrade buttons → `api/stripe-checkout.js`. Returns `?upgraded=1` → success banner.
- Holiday mode + cover email scanning.

---

## ONBOARDING FLOW — 8 STEPS

0. Your website — Firecrawl scan → pre-populates 8 fields. Skip path for no website.
1. Business type
2. About your business
3. Your services
4. Your boundaries (banned services)
5. Your partners
6. Choose your plan — subscription (tier selector) or PAYG (cost limit input)
7. Review & launch

On submit: creates tenant row, inserts services, partners, membership.

---

## VERA HELP MASCOT

`HelpMascot.jsx` — violet owl, 44×72px. Three modes:
- **Hover mode** — click Vera → hover any [data-help] → FloatingBubble explanation.
- **Zone mode** — "Need more help?" → amber glow on [data-help] zones → click → VeraDialogue panel.
- **Proactive speech** — checks `vera_speeches` (by `context_key`) on tab load, shows once per tenant (`vera_seen`).

`VeraDialogue.jsx` — 340×420px draggable panel, Claude Haiku, Enter to send.
Label: "Click on Vera the owl / for suggestions" — 12px, `#5e3b87`, italic.
`data-help` on all section headings and key elements across all 9 tabs.

`TAB_CONTEXT` in Portal.jsx maps every tab to its `context_key`. Listen tab = `listen.first_visit`.

---

## DEMO SYSTEM

**Flow:** `/demo/login` → `/demo/select` → `/demo/tier/:id` → `/demo/portal/:id/:tier`
**Side route:** `/demo/performance` (aggregate stats for all businesses)

**Session:** stored in localStorage as `demo_session: { id, email, name, role }`. No Supabase auth involved. Clears via `localStorage.removeItem('demo_session')`.

**DemoContext.jsx:** fetches all demo_ tables in parallel, shapes data to match portal tab expectations:
- ActivityDashboard: `caller_name` direct, `duration_seconds` direct
- DataAnalytics: `triage_outcome` direct, `duration_seconds` → `duration`
- referral_log: `partner_name` direct (not join)
- leads: `caller_name` + `caller_number` direct (not join)

**demo_call_logs:** has `transcript` column. Seeded transcripts for businesses b01–b04, b05, b06–b07, b09, b10.

**Staff specialist_services in demo:** stored as comma-separated text, `normaliseSpecs()` converts to array. Values must match exact `demo_services.name` for chips to highlight.

`DemoBanner.jsx` — amber strip, inline tier switcher, never dismissible.
All tab saves guard: `if (isDemo || isPreview || !tenantId) return`

---

## STRIPE BILLING — BUILT, NEEDS SETUP

Checkout flow: Upgrade → `api/stripe-checkout.js` → new sub: redirect to Stripe / existing sub: direct price swap → `api/stripe-webhook.js` updates tenant.tier.

**Setup required:**
1. Stripe Dashboard → 4 products: Light £29, Standard £49, Professional £69, Enterprise £249. Monthly recurring GBP. Copy price_xxx IDs.
2. Stripe Webhooks → endpoint: `https://verrante-portal.vercel.app/api/stripe-webhook` → events: checkout.session.completed, customer.subscription.updated/deleted. Copy whsec_ secret.
3. Vercel env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_LIGHT/STANDARD/PROFESSIONAL/ENTERPRISE, SITE_URL.
4. Test with card 4242 4242 4242 4242.

---

## INTEGRATIONS — 9 LIVE, 10 COMING SOON

Live (status: 'available'): WhatsApp Business, FreeAgent, Xero, Google Calendar, Google Business Profile, Stripe Payments, Checkatrade, Rated People, Zapier.

Coming soon: 10 integrations in framework (category filter: Calendar / Messaging / Accounting / Reviews / Field Service / Payments / Booking / CRM / Automation).

To activate a new integration: set `status: 'available'` + add connect handler. No architectural change.

FreeAgent + Xero: require dev OAuth apps. Redirect URIs: `https://verrante-portal.vercel.app/api/{freeagent|xero}-callback`.

---

## PROMPT BUILDER (_build-prompt.js)

Layer 1 constants (locked, never editable):
- LAYER_1_CORE_VALUES — warmth + human presence mandate
- LAYER_1_JUDGEMENT — emergency override, common sense escalation

`buildSystemPrompt(data)`: Layer 1 → business identity + tone → greeting → services + partners (with normalised column names) → 5 call type rules → filters → emergency keywords → additional instructions → 7-value triage_outcome taxonomy.

`buildAnalysisPlan()`: Vapi summaryPrompt + structuredDataSchema for triage_outcome (7 values), caller_name, referred_to.

Staff block: injected when staff exist (Enterprise). Includes `direct_line_did` numbers.
`specialist_services` handled: `Array.isArray(s.specialist_services) ? s.specialist_services.join(', ') : s.specialist_services`

Sensitive business type: `isSensitive=true` → minimal capture mode (name + number + urgency only).

---

## VISUAL LANGUAGE — LOCKED

All inline styles. No CSS files. No CSS variables.

| Token | Value |
|-------|-------|
| Violet primary | #5e3b87 |
| Violet dark | #4a2d6e |
| Violet deep | #3a2057 |
| Amber | #f0a500 |
| Amber text on buttons | #1a0533 |
| Amber light | #fef3d9 |
| Page bg | #f7f6f9 |
| Card border | 0.5px solid rgba(94,59,135,0.1) |
| Success | #3db87a |
| Text | #1a1a1a · #666 · #aaa |

Fonts: Syne 700 (headings/logo/numbers). DM Sans 300/400/500 (body).
Primary button: `#f0a500` bg, `#1a0533` text, borderRadius 8px.
Disabled: `#f5d98a` bg, `#7a5c1a` text.
Secondary: white bg, violet border.
Locked sections: `blur(3px)` + `opacity 0.45` + absolute white badge.
Logo: "Qerxel" Syne 700 + 7px amber dot.

---

## CODE CONVENTIONS

- `.maybeSingle()` not `.single()` — prevents 406 on 0 rows
- All Supabase queries: try/catch with finally { setLoading(false) }
- Tier checks: `isEnterprise = ['enterprise','bespoke'].includes(tier)`
- Save guard: `if (isDemo || isPreview || !tenantId) return` — on every mutation in every tab
- Demo pattern: `const demo = useDemo(); const isDemo = !!demo?.isDemo` — two useEffects (demo injection + real fetch, both gated)
- No CSS files — all inline styles
- `data-help` on all section headings and key UI elements
- Supabase anon key safe in frontend. Service role key NEVER in frontend.
- Demo tables prefixed `demo_`. Never join to production tables.
- Appointments belong to `staff_profile_id` not `tenant_id` directly — do not change this.
- Integrations: each integration is a self-contained object in INTEGRATIONS array.
- Calendar is a standalone product — never conditionally render it based on AI features.
- Column name gotchas: `referral_partners` uses `partner_name`/`contact_phone`; `banned_services` uses `banned_item`; `referral_service_map` uses `service_keyword`.

---

## CURRENT BUILD STATE — ALL BUILT AND COMMITTED

- All 9 portal tabs: Dashboard, AI Behaviour, Analytics, Partners, Listen, Team, Calendar, Integrations, Account
- Business Profile (not in sidebar)
- Auth guards bidirectional (Portal ↔ Onboarding)
- Vapi webhook + sync end-to-end confirmed
- System prompt builder Layer 1–3 (correct column names fixed session 16)
- Vera mascot full system (hover / zone / proactive / dialogue). All 9 tab speeches seeded.
- GDPR Privacy & Data section (retention, export, delete)
- RLS on all production tables
- Free tier + PAYG billing throughout
- Overage voice preference (AI Behaviour)
- Daily PAYG cost report + minute notifications (Resend + vercel cron)
- Website scraping onboarding step 0 (Firecrawl + Claude Haiku)
- Owner preview mode (PreviewContext, all tabs)
- Support chat (api/support-chat.js + AccountSettings wired)
- Stripe billing built (wired, needs Stripe product setup)
- Demo system: 10 businesses, all tiers, all tabs wired. Transcripts seeded for 8 businesses.
- 9 live integrations: WhatsApp, FreeAgent, Xero, Google Calendar, Google Business, Stripe Pay, Checkatrade, Rated People, Zapier
- Calendar: DnD, split appointments, solo/team mode, CalDAV sync, appointment reminders
- Staff directory: structured tag picker (catalogue chips + custom skills), colour avatars, slide-in panel
- Listen tab: transcript archive, bubble UI, outcome filters, cross-tab prefill from Dashboard
- Pick-and-mix plan configurator (/plans)
- AI Behaviour status hero
- Business Profile completeness bar + service/staff/catalogue counts

---

## USER ACTIONS STILL NEEDED

- **Stripe setup:** products in Stripe Dashboard, webhook endpoint, 7 Vercel env vars (see Stripe section)
- **FreeAgent + Xero:** create dev OAuth apps, add CLIENT_ID/SECRET to Vercel
- **Confirm "Schedule" as product name** — replaces "Calendar" throughout portal
- **Confirm new tier pricing** when ready to update portal
- **Vera/AI name** — pending Philip choosing

---

## PARKED — CONFIRMED SPEC, NOT YET BUILT

- **Calendar Sessions 3–5:** two-way CalDAV pull, Enterprise manager views, public customer booking page
- **Phone line white label** — `VITE_PHONE_LINE_ENABLED=false`. Waiting on partner contract (The VoIP Shop). PSTN 2027 switch-off is the marketing moment.
- **Qerxel Assist** — real-time catalogue matching during calls. `catalogue_items` table exists, api not yet built.
- **Enterprise AI receptionist** — warm transfer mid-call (Vapi warm transfer feature).
- **Public Playground** — live voice demo (Cartesia Sonic 3.5, 8 languages, 5 dialects).
- **Referred signup surface** — `?ref=TENANTCODE` landing page.

---

## FUTURE TASKS

- get_vapi_context PostgreSQL function (SQL written, not deployed)
- VIP caller context injection (UI built, Vapi routing pending)
- Twilio SMS follow-up wiring
- Weekly/monthly email reports
- Number blocking (table + placeholder built, logic pending)
- n8n migration at 30 tenants
- Domain confirmation (qerxel.com)
- Terms of service, Privacy policy, Data covenant documents
- ICO registration (~£40–60/year)

---

## PRACTICAL NOTES

- Dev server: `cd C:\Users\philo\verrante-portal` then `npm run dev` (two commands, no &&)
- Runs on http://localhost:5173 (may shift to 5174/5175)
- F12 hijacked — use Ctrl+Shift+I or right-click Inspect
- **Vercel auto-deploy broken** — use `npx vercel deploy --prod` from project root
- Hot reload active — file saves go straight to browser
- Supabase SQL Editor: paste SQL contents (not filename), run, confirm success
- `demo_seed.sql`: safe to re-run — truncates before reseeding
- `vercel.json`: crons for notify-daily-cost (09:00 UTC daily) and notify-renewal (08:00 1st of month)
- Management API token: `sbp_108f685a1ea2b0a929aee91a498bea0d329bdf4a` (for direct DB queries when needed)
