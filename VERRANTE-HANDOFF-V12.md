# VERRANTE — COMPLETE PROJECT HANDOFF DOCUMENT V12
## Read this at the start of every new conversation thread.
## Also read: STRATEGY-ADDENDUM-V2.md (commercial decisions, tier detail, calendar spec)
## Last updated: 2026-06-05 (session 8)

---

## WHAT VERRANTE IS

AI call handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers out-of-scope callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

Working name. Not legally confirmed yet.
Core sales framing — LOCKED: **"Never miss another lead."**
Scale intent: 500 tenants before any tech hires. All development via Claude Code.

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator. Uses Claude Code (VSCode extension) for all development.

Dev environment: **Windows 11, VSCode, PowerShell.** F12 hijacked by ASUS — uses Ctrl+Shift+I. **PowerShell does not support `&&` — always two separate commands.**

---

## TIER STRUCTURE — UPDATED 2026-06-05

| Tier | Price | Concurrent | Minutes | Referrals |
|------|-------|-----------|---------|-----------|
| Free | £0 (PAYG £0.35/min) | 1 | 0 (PAYG) | Yes |
| Light | £29/month | 1 | 120 | Yes |
| Standard | £49/month | 1 | 250 | Yes |
| Professional | £69/month | 2 | 450 | Yes |
| Enterprise | £249/month | 3+ | 1,000 | No |
| Bespoke | Contact us | Custom | Custom | Negotiated |

Overage (subscription): Premium voice **£0.18/min** · Standard voice **£0.14/min**
PAYG: flat **£0.35/min** on Standard voice.
Spam and autodialler filtered calls: **always free** on all tiers.
Enterprise has NO referral network — value from product capability only.

**Voice tiers:**
- Premium: Cartesia Sonic 3.5 + GPT-4o mini (~£0.067/min, charge £0.18)
- Standard: Cartesia Sonic 3 + Gemini Flash (~£0.062/min, charge £0.14)
- STT: Deepgram Nova-2 on both. Non-negotiable.
- All paid subscription tiers: Premium voice included. Free tier: Standard only.

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
| Frontend | React/Vite → Vercel (auto-deploys on push to master) |
| SMS | Twilio |
| Email | Resend (transactional — daily cost reports, minute alerts) |
| Payments | Stripe (wired) |
| Website scraping | Firecrawl (onboarding) |
| Calendar | react-big-calendar + date-fns |
| Vera AI | Claude Haiku (vera-chat, greeting-generator, support-chat, scrape-website) |

---

## SUPABASE

Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co

Anon key (HS256 — use this, NOT sb_publishable_):
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ`

GitHub: https://github.com/philsk1/verante-portal
Live URL: https://verante-portal.vercel.app

**RLS:** Enabled on all production tables. Script: `supabase_rls.sql` (idempotent).
Helper: `is_tenant_member(tid)`. HS256 anon key works with `auth.uid()`.
**NEVER switch to ES256 `sb_publishable_` key** — PostgREST cannot validate ES256, auth.uid() returns null.
Vapi webhook + owner-tenants.js use service_role key (bypass RLS). Correct.
Demo tables (demo_*): no RLS — public read.

---

## DATABASE

### Production tables (all live, RLS enabled)
business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules, vera_speeches, vera_seen

**Pending — run `supabase_migrations_session4.sql` in SQL Editor:**
appointments, staff_availability, tenant_catalogue + all new tenant columns below.

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
phone_line_monthly_cost (decimal, default 8.00), phone_line_partner_ref
```

### profiles table
id (= auth.uid()), email, **is_owner** (boolean — set true for finsolsoffice@gmail.com to enable owner preview mode)

### appointments table (pending migration)
id, tenant_id, staff_profile_id (FK → staff_profiles — critical design: appointments belong to staff, not tenant), caller_id, lead_id, title, description, start_time, end_time, processing_start_time, processing_end_time, status (provisional|confirmed|completed|cancelled|no_show), appointment_type, colour_formula, client_notes, reminder_sent_24h, reminder_sent_1h, created_from (manual|ai_call|lead_conversion|customer_booking), created_at

### staff_availability table (pending migration)
id, staff_profile_id, day_of_week (0–6), start_time, end_time, active

### demo_businesses key columns
id (fixed uuid), business_name, business_type, tier, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, tone_register, business_outcome_type, greeting_message, included_minutes, credits_balance, referral_code

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

Full UUID pattern: `00000000-0000-0000-0000-00000000000X`
Demo login: demo@verrante.app / VERRANTE2026

---

## KEY FILES

```
src/supabase.js                      — HS256 anon key (hardcoded, correct)
src/context/AuthContext.jsx          — Supabase auth session
src/context/DemoContext.jsx          — demo data provider; all tabs check useDemo()
src/context/PreviewContext.jsx       — enterPreview/exitPreview/isPreview (owner mode)
src/App.jsx                          — routes, PreviewProvider wraps all routes
src/pages/Portal.jsx                 — shell, nav, 8-tab routing, owner dropdown
src/pages/BusinessProfile.jsx
src/pages/AIBehaviour.jsx
src/pages/ActivityDashboard.jsx      — default tab
src/pages/DataAnalytics.jsx
src/pages/PartnersReferrals.jsx
src/pages/AccountSettings.jsx
src/pages/Calendar.jsx               — Verrante Calendar (standalone product tab)
src/pages/Integrations.jsx           — Integrations tab (module framework)
src/pages/Onboarding.jsx             — 8-step onboarding with website scraping
src/pages/Login.jsx, Signup.jsx
src/pages/DemoLogin.jsx              — /demo/login
src/pages/BusinessSelector.jsx       — /demo/select
src/pages/TierSelector.jsx           — /demo/tier/:id
src/pages/DemoPortal.jsx             — /demo/portal/:id/:tier
src/pages/SalesPerformance.jsx       — /demo/performance
src/components/HelpMascot.jsx        — Vera owl + hover/zone/dialogue system
src/components/VeraDialogue.jsx      — draggable Claude Haiku chat panel
src/components/DemoBanner.jsx        — amber banner + inline tier switcher
api/vapi-webhook.js                  — end-of-call handler (service role)
api/vapi-sync.js                     — patches Vapi assistant on AI Behaviour save
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
supabase_rls.sql                     — idempotent RLS script (safe to re-run)
supabase_migrations_session4.sql     — ALL pending migrations — run this next
demo_seed.sql                        — demo data seed (safe to re-run)
vercel.json                          — rewrites + cron jobs (notify-daily-cost, notify-renewal)
```

---

## API ENDPOINTS

| Endpoint | Purpose |
|----------|---------|
| api/vapi-webhook.js | Vapi end-of-call events → call_logs + leads. PAYG cost limit check. Service role. |
| api/vapi-sync.js | POST {tenantId} → builds prompt, PATCHes Vapi assistant. |
| api/vapi-assistant-request.js | Vapi real-time assistant-request handler. |
| api/_build-prompt.js | buildSystemPrompt() + buildAnalysisPlan(). Shared module. |
| api/vera-chat.js | POST {zoneText, zoneName, tabName, messages} → Claude Haiku. |
| api/greeting-generator.js | Greeting generator — Claude Haiku. |
| api/support-chat.js | POST {tenantId, messages} → Claude Haiku with live tenant context. |
| api/scrape-website.js | POST {url} → Firecrawl + Claude Haiku → {fields, found}. |
| api/notify-daily-cost.js | Daily cron 09:00 UTC — PAYG cost report to tenants with calls today. |
| api/owner-tenants.js | POST {email} → all tenants for owner preview. Email-gated. Service role. |
| api/stripe-checkout.js | POST {tenantId, targetTier} → Checkout URL (new) or direct swap (existing sub). |
| api/stripe-webhook.js | checkout.session.completed, subscription.updated, subscription.deleted. Raw body + sig. |
| api/remind-appointments.js | Hourly cron. Finds appointments in 24h and 1h windows (reminder_sent_Xh=false), sends Resend email, marks sent. |
| api/integrations-connect.js | POST {tenantId, integrationId, credentials, settings} — stores credentials (service role) + settings (tenant-readable). |
| api/integrations-disconnect.js | POST {tenantId, integrationId} — removes integration + credentials. |
| api/whatsapp-send.js | POST {tenantId, to, message} — sends WhatsApp message via Meta Cloud API using tenant's own credentials. |
| api/freeagent-auth.js | GET ?tenantId — redirects to FreeAgent OAuth. |
| api/freeagent-callback.js | GET ?code&state — exchanges OAuth code, stores tokens, redirects to portal. |
| api/freeagent-invoice.js | POST {tenantId, leadId} — creates draft invoice in FreeAgent from a lead. Handles token refresh. |

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
| STRIPE_PRICE_LIGHT | stripe-checkout, stripe-webhook |
| STRIPE_PRICE_STANDARD | stripe-checkout, stripe-webhook |
| STRIPE_PRICE_PROFESSIONAL | stripe-checkout, stripe-webhook |
| STRIPE_PRICE_ENTERPRISE | stripe-checkout, stripe-webhook |
| SITE_URL | stripe-checkout, freeagent-auth/callback, whatsapp-send (trigger URL) |
| FREEAGENT_CLIENT_ID | freeagent-auth, freeagent-callback |
| FREEAGENT_CLIENT_SECRET | freeagent-callback |

---

## PORTAL STRUCTURE — 8 TABS

Shell: 64px violet header (`#5e3b87`) → 44px dark violet nav (`#4a2d6e`, amber underline on active) → `#f7f6f9` content, maxWidth 940px, padding 2rem. Default tab: Dashboard.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | Built |
| AI Behaviour | AIBehaviour.jsx | Built + Vapi sync |
| Dashboard | ActivityDashboard.jsx | Built, end-to-end confirmed |
| Analytics | DataAnalytics.jsx | Built |
| Partners & Referrals | PartnersReferrals.jsx | Built |
| Calendar | Calendar.jsx | Built — Sessions 1 + 2 |
| Integrations | Integrations.jsx | Built — framework only |
| Account | AccountSettings.jsx | Built |

**Owner preview mode:** is_owner accounts (profiles.is_owner = true) see a tenant dropdown in the header. Selecting a tenant enters preview via PreviewContext — amber banner, all tabs use previewTenantId, all saves blocked. api/owner-tenants.js provides the tenant list (service role, email-gated).

**Save guard — all tabs and Calendar:** `if (isDemo || isPreview || !tenantId) return`

---

## TAB DETAILS — KEY FACTS

**AI Behaviour:** Overage voice preference radio (Premium 18p / Standard 14p) in Call Handling section. Paid subscription tiers only. Stored in tenants.overage_voice_preference.

**Dashboard:** call_outcome badge values: booked, lead_captured, referred_out, filtered, escalated, hard_close, spam. Reads duration_seconds (NOT duration).

**Analytics:** Reads duration (NOT duration_seconds). Reads triage_outcome (NOT call_outcome).

**Partners & Referrals:** Partner network unlimited at ALL tiers. LOCKED.

**Account:** Support chat LIVE — wired to api/support-chat.js. Plan & Billing: Upgrade buttons call api/stripe-checkout.js. PAYG tenants: editable cost limit field. Returns from Stripe: ?upgraded=1 → green success banner.

**Calendar (standalone product — never couple to AI call handling):**
- react-big-calendar + date-fns-localizer + DnD addon. UK locale (Mon start).
- Views: month / week / day. Drag/drop + resize → writes to Supabase. Drag between staff columns reassigns staff.
- Appointment statuses + colours: provisional (amber), confirmed (violet), completed (green), cancelled (grey), no_show (red).
- Slot < 30 min: warning shown, NOT blocked.
- Appointments belong to staff_profile_id (FK to staff_profiles) — critical design decision for scaling solo → Enterprise.
- **Solo / Team mode toggle** — shown when staff_profiles exist. Team mode = resource view with one column per staff member.
- **Split appointments** — checkbox in modal. Processing start/end inputs appear. Custom SplitEventComponent renders event as three sections: active (full colour) → processing (lighter dashed) → finish (full colour). Proportional heights.
- Demo mode: 5 seeded events across 2 demo staff members, including one split appointment showing the colour processing feature.

**Integrations (framework only):**
- 19 integrations defined, all status: 'coming_soon'.
- Category filter: Calendar / Messaging / Accounting / Reviews / Field Service / Payments / Booking / CRM / Automation.
- To activate: set status: 'available' + add connect handler. No architectural change.
- Priority 1 (build first): Google Calendar, Google Business Profile, WhatsApp Business, FreeAgent, Xero.

---

## ONBOARDING FLOW — 8 STEPS

0. Your website — Firecrawl scan (api/scrape-website.js) → pre-populates 8 fields. "No website? No problem." skip path.
1. Business type
2. About your business
3. Your services
4. Your boundaries
5. Your partners
6. Choose your plan — subscription (tier selector, first month free) or PAYG (cost limit input)
7. Review & launch

On submit: creates tenant row (billing_model, tier, monthly_cost_limit), inserts services, partners, membership.

---

## VERA HELP MASCOT

HelpMascot.jsx — violet owl, 44×72px. Three modes:
- **Hover mode** — click Vera → hover any [data-help] → FloatingBubble.
- **Zone mode** — "Need more help?" → amber glow on all [data-help] zones → click → VeraDialogue panel.
- **Proactive speech** — checks vera_speeches on tab load, shows once per tenant (vera_seen).

VeraDialogue.jsx — 340×420px draggable panel, Claude Haiku, Enter to send.
Label: "Click on Vera the owl / for suggestions" — 12px, #5e3b87, italic, two lines.
data-help on all section headings and key elements across all 8 tabs.

---

## DEMO SYSTEM — FULLY BUILT

Flow: `/demo/login` → `/demo/select` → `/demo/tier/:id` → `/demo/portal/:id/:tier`
Side route: `/demo/performance`

DemoContext.jsx: fetches all demo_ tables in parallel, shapes data to match what portal tabs expect:
- ActivityDashboard: caller_name as display, duration_seconds direct
- DataAnalytics: triage_outcome direct, duration_seconds mapped → duration
- referral_log: partner_name direct (not join)
- leads: caller_name + caller_number direct (not join)

DemoBanner.jsx — amber strip, inline tier switcher, never dismissible.
demo_sessions: inserted on every DemoPortal mount.
All tab saves guard: `if (isDemo || isPreview || !tenantId) return`

---

## STRIPE BILLING — BUILT, NEEDS SETUP

**Checkout flow:**
1. Tenant clicks Upgrade → AccountSettings calls POST /api/stripe-checkout {tenantId, targetTier}
2. New subscriber: returns {mode: 'redirect', url} → frontend redirects to Stripe Checkout
3. Existing subscriber: direct price swap → returns {mode: 'updated', tier} → success banner
4. Stripe fires webhook → api/stripe-webhook.js → updates tenants.tier + stripe IDs

**Setup required (not yet done):**
1. Stripe Dashboard → create 4 products: Light £29, Standard £49, Professional £69, Enterprise £249. All monthly recurring GBP. Copy price_xxx IDs.
2. Stripe Dashboard → Webhooks → Add endpoint: `https://verante-portal.vercel.app/api/stripe-webhook` → events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted → copy whsec_ secret.
3. Vercel env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_LIGHT/STANDARD/PROFESSIONAL/ENTERPRISE, SITE_URL.
4. Redeploy after adding env vars.
5. Test with card 4242 4242 4242 4242.

---

## PROMPT BUILDER (_build-prompt.js)

Layer 1 constants (locked, never editable):
- LAYER_1_CORE_VALUES — warmth + human presence mandate
- LAYER_1_JUDGEMENT — emergency override, common sense escalation

buildSystemPrompt(data): Layer 1 → business identity + tone → greeting → "please allow me" → services + partners → 5 call type rules → filters → emergency keywords → additional instructions → 7-value triage_outcome taxonomy.

Sensitive business type override: isSensitive=true → minimal capture mode (name + number + urgency only).

buildAnalysisPlan(): Vapi summaryPrompt + structuredDataSchema for triage_outcome (7 values), caller_name, referred_to.

---

## VISUAL LANGUAGE — LOCKED

All inline styles. No CSS files. No CSS variables.

| Token | Value |
|-------|-------|
| Violet primary | #5e3b87 |
| Violet dark | #4a2d6e |
| Violet deep | #3a2057 |
| Amber | #f0a500 |
| Amber light | #fef3d9 |
| Page bg | #f7f6f9 |
| Card border | 0.5px solid rgba(94,59,135,0.1) |
| Success | #3db87a |
| Text | #1a1a1a · #666 · #aaa |

Fonts: Syne 700 (headings/logo/numbers). DM Sans 300/400/500 (body).
Primary button: #f0a500 bg, #1a0533 text, borderRadius 8px.
Disabled: #f5d98a bg, #7a5c1a text.
Secondary: white bg, violet border.
Locked sections: blur(3px) + opacity 0.45 + absolute white badge.
Logo: "Verrante" Syne 700 + 7px amber dot.

---

## CURRENT BUILD STATE

### Fully built and committed
- All 8 portal tabs (incl. Calendar Session 1, Integrations framework)
- Auth guards bidirectional
- Vapi webhook + sync end-to-end confirmed
- System prompt builder Layer 1–3
- Vera mascot full system (hover / zone / proactive / dialogue)
- GDPR Privacy & Data section
- RLS on all production tables
- Free tier + PAYG billing model throughout
- Overage voice preference (AI Behaviour tab)
- Minute notifications — 80% warning, exhausted, renewal (Resend + vercel.json cron)
- Daily PAYG cost report (cron 09:00 UTC)
- PAYG cost limit check in vapi-webhook
- Website scraping onboarding step 0 (Firecrawl + Claude Haiku)
- Plan selection step 6 in onboarding
- Owner preview mode (PreviewContext, all 8 tabs)
- Support chat live (api/support-chat.js + AccountSettings wired)
- Stripe billing (api/stripe-checkout.js + api/stripe-webhook.js + UI wired)
- Demo system complete (all 5 routes, DemoContext, session tracking)

### Done — session 8 (2026-06-05) — Priority 1 integrations
- Integration DB schema: tenant_integrations (settings, RLS for tenants) + tenant_integration_credentials (tokens, service role only). Migration: supabase_migrations_integrations.sql
- WhatsApp Business: inline connect form (Phone Number ID + access token + template), api/whatsapp-send.js, automatic follow-up fired from vapi-webhook.js on lead_captured
- FreeAgent: full OAuth flow (api/freeagent-auth → api/freeagent-callback), token refresh, api/freeagent-invoice.js creates draft invoice from any lead
- Integrations tab: loads connected state from DB, WhatsApp + FreeAgent connect/disconnect UI, returns from OAuth handled
- ActivityDashboard: "Invoice" button on each lead (fires only when FreeAgent connected), "Book" button already there
- Portal.jsx: defaults to integrations tab on return from OAuth (?tab=integrations)
- New Vercel env vars needed: FREEAGENT_CLIENT_ID, FREEAGENT_CLIENT_SECRET (+ existing SITE_URL)
- New DB migration: run [supabase_migrations_integrations.sql](supabase_migrations_integrations.sql)

### Done — session 7 (2026-06-05)
- Lead → Appointment: "Book" button on Dashboard leads. Navigates to Calendar tab with prefill (name + notes). Portal.jsx extended: `handleNavigate(tabId, prefillData)`, `calendarPrefill` state, `onPrefillConsumed` callback.
- Appointment reminders: api/remind-appointments.js, vercel.json hourly cron, 24h + 1h windows. emailAppointmentReminder template added to _emails.js.
- Staff extension recognition (Enterprise): `direct_line_did` column on staff_profiles (in migration file). BusinessProfile.jsx: DID input in add form, DID shown in staff row. vapi-sync.js: fetches staff including direct_line_did. _build-prompt.js: OUR TEAM block injected when staff exist — includes direct line numbers.

### Not yet committed (all changes in working tree)
→ **Commit and push before next session.**

### Pending actions before features work
1. **Run `supabase_migrations_session4.sql`** in Supabase SQL Editor (Calendar + Stripe + DID columns)
2. **Stripe setup** — products, webhook, 7 Vercel env vars (see Stripe section above)

### Next build priorities
1. Run [supabase_migrations_integrations.sql](supabase_migrations_integrations.sql) in Supabase SQL Editor
2. FreeAgent setup: create app at dev.freeagent.com → add FREEAGENT_CLIENT_ID + FREEAGENT_CLIENT_SECRET to Vercel, set redirect URI to https://verante-portal.vercel.app/api/freeagent-callback
3. WhatsApp setup: Meta Business Manager → WhatsApp Business API → get Phone Number ID + permanent token
4. Integration builds — Priority 1 remaining: Xero, Google Calendar, Google Business Profile
5. Calendar Session 3 — CalDAV external sync (Google, Apple, Outlook)
3. Calendar Session 4 — Enterprise mode (manager views, permissions)
4. Calendar Session 5 — customer booking page (public URL, self-book)
5. Phone line feature — behind VITE_PHONE_LINE_ENABLED=false, waiting on partner contract
6. Public Playground — Cartesia Sonic 3.5 live, 8 languages × 5 dialects

---

## CODE CONVENTIONS

- `.maybeSingle()` not `.single()` — prevents 406 on 0 rows
- All Supabase queries: try/catch with finally { setLoading(false) }
- Tier checks: `isEnterprise = ['enterprise','bespoke'].includes(tier)`
- Save guard: `if (isDemo || isPreview || !tenantId) return` — on every mutation in every tab
- Demo pattern: `const demo = useDemo(); const isDemo = !!demo?.isDemo` — two useEffects (demo injection + real fetch, both gated)
- No CSS files — all inline styles
- data-help on all section headings and key UI elements
- Supabase anon key safe in frontend. Service role key NEVER in frontend.
- Demo tables prefixed demo_. Never join to production tables.
- Appointments belong to staff_profile_id not tenant_id directly — do not change this.
- Integrations: each integration is a self-contained object in INTEGRATIONS array. Add status + handler, never touch the framework.
- Calendar is a standalone product — never conditionally render it based on AI call handling features.

---

## PARKED — CONFIRMED SPEC, NOT YET BUILT

- **Verrante Calendar Sessions 3–5** (see Strategy Addendum V2 for full spec — Sessions 1 and 2 complete)
- **Phone line white label** — behind VITE_PHONE_LINE_ENABLED=false. Waiting on partner contract (The VoIP Shop first). PSTN 2027 switch-off is the marketing moment.
- **Product catalogue matching** — Enterprise. tenant_catalogue table exists (pending migration). api/catalogue-crawl.js not yet built.
- **Enterprise AI receptionist** — warm transfer mid-call. Vapi warm transfer feature.
- **Public Playground** — Cartesia Sonic 3.5 live generation, 8 languages, 5 dialects each.
- **Referred signup surface** — ?ref=TENANTCODE page.
- **Call sample recordings** — 15 pre-recorded MP3s (5 call types × 3 modes).

---

## FUTURE TASKS — PARKED

- get_vapi_context PostgreSQL function (SQL written, not deployed)
- VIP caller context injection (UI built, Vapi routing pending)
- Staff specialist routing (UI built, Vapi routing pending)
- Twilio SMS integration
- Weekly/monthly email reports
- Number blocking (table + placeholder built, logic pending)
- CSV import for client data
- n8n migration at 30 tenants
- Pricing intelligence coaching feature
- Multi-site and franchise architecture (post revenue)
- Domain confirmation (verrante.com)
- Terms of service, Privacy policy, Data covenant documents
- ICO registration (~£40–60/year)

---

## PRACTICAL NOTES

- Dev server: two separate commands — `cd C:\Users\philo\verrante-portal` then `npm run dev`
- Runs on http://localhost:5173 (may shift to 5174/5175)
- PowerShell: no && — always two separate commands or use Bash tool
- F12 hijacked — use Ctrl+Shift+I or right-click Inspect
- Vercel: auto-deploys on push to master
- Hot reload active — file saves go straight to browser
- Supabase SQL Editor: paste SQL contents (not filename), run, confirm success
- demo_seed.sql: safe to re-run — truncates before reseeding
- supabase_migrations_session4.sql: safe to re-run — all IF NOT EXISTS
- vercel.json: crons for notify-daily-cost (09:00 UTC daily) and notify-renewal (08:00 1st of month)
