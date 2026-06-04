# VERRANTE — PROJECT HANDOFF DOCUMENT
Last updated: 2026-06-04

---

## WHAT VERRANTE IS

A multi-tenant AI call handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers out-of-scope callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

Core sales framing — LOCKED: "Never miss another lead."

The product is not a call answering service. It is a CRM that starts with a phone call. Every downstream feature — follow-up messaging, pricing intelligence, referral network, win rate coaching — compounds on that foundation.

---

## STRATEGIC FOUNDATIONS — LOCKED

Price point is deliberately aggressive. Designed to eliminate decision friction for sole traders who have never bought software. Traction and data flywheel take priority over margin at this stage.

Flywheel: better system → tenant leans on it more → more data → smarter system → more value → more referrals → network density increases → each tenant gets more inbound referrals → leaning increases further.

Referral psychology: a tenant who has sent four referrals out actively demands reciprocation. This creates membership culture, not just word of mouth.

Advertising principle: at the right moment every penny of profit goes into advertising. Every infrastructure and UX decision carries an implicit advertising readiness test: could this handle ten times the load tomorrow.

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator — reads decisions, doesn't just execute. Tech hires deliberately deferred. Uses Claude Code (VSCode extension) for all development.

Risk window: 50–500 tenants. Three protections: AI handles support, agencies over employees in this window, any human hire works the human layer not the technical one.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools. PowerShell does not support && — always two separate commands. Bash tool preferred when available.

---

## TIER STRUCTURE — LOCKED

| Tier | Price | Concurrent | Minutes/mo | Key features |
|------|-------|-----------|------------|--------------|
| Light | £29/month | 1 | 60 | Core call handling, referrals |
| Standard | £49/month | 1 | 150 | Core + higher volume, referrals |
| Professional | £69/month | 2 | 250 | Two concurrent, calendar, sensitive data mode, referrals |
| Enterprise | £249/month | 3+ | 700 | Full staff routing, calendar, provisional booking — NO referral network |
| Bespoke | Contact us | Custom | Custom | Franchise, multi-site |

Overage: £0.18/min

Enterprise has NO referral network. Enterprise value is entirely from product capability.

Professional tier sell: "You're on a call, another comes in, they hang up. Verrante catches the second call while you're on the first."

**Tier checks in code:**
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
| LLM | Gemini 1.5 Flash or GPT-4o mini |
| TTS | Cartesia or Deepgram Aura |
| Database | Supabase (PostgreSQL) |
| Automation | Make.com → self-hosted n8n at 30 tenants |
| Frontend | React + Vite → Vercel (auto-deploys on git push) |
| SMS | Twilio Messaging |
| Payments | Stripe (not yet wired) |
| Calendar | CalDAV (Professional and Enterprise) |
| Vera AI | Claude Haiku (Anthropic API, vera-chat + greeting-generator endpoints) |

---

## SUPABASE — CONFIRMED DETAILS

- Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co
- Anon key (legacy HS256 — use this, NOT the sb_publishable_ format):
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ
- Service role key: in Vercel environment variables only. NEVER in frontend code.

### RLS STATUS
RLS currently DISABLED on all tables. Pre-launch decision — re-enable before first paying tenant. Policies are written in `supabase_rls.sql`. See Task 3 below.

---

## AI INSTRUCTION ARCHITECTURE — LOCKED

Three layers govern every system prompt.

**Layer 1 — Verrante owned. Injected into every prompt. Never editable or visible to tenant.**

Core values (verbatim — never change without founder instruction):
> "You are a warm, professional, and considerate assistant. You speak in human terms at all times — with kindness, willingness, and genuine care for the person you are speaking with. You are never robotic, never bureaucratic, never cold. You do not perform warmth — you express it naturally through the way you phrase things, the pace you set, and the care you take with every caller. Even in your most formal register you remain considerate and human. You never claim to be a person but you always behave like one worth trusting."

Judgement override (verbatim — never change without founder instruction):
> "You are an intelligent assistant, not a rule-following robot. If a caller's tone, words, or situation clearly falls outside the scope of normal business enquiries — personal urgency, distress, safety concerns, or anything that common sense tells you requires immediate human attention — escalate immediately regardless of any other instructions. Always err on the side of the human."

**Layer 2 — Tenant owned but protected.** Greeting message. Pre-populated from seed. Editable via single warning modal. Restore Default always available.

**Layer 3 — Tenant owned, freely editable.** Services, opening hours, call type rules, emergency keywords, callback preference, everything else.

---

## THE GREETING — LOCKED

### Warm register — default all tiers
> "Good morning, [Business Name]. [Owner Name] is busy — I'm their virtual assistant. [resolution ending] How can I help you?"

### Formal register — optional via toggle, all tiers
> "Good morning. You have reached [Business Name]. [Owner Name] is currently unavailable — I am their virtual assistant. I will be taking a brief note of your enquiry to ensure it receives [Owner Name]'s personal attention. How may I assist you?"

### Resolution endings (warm only — substituted based on config)
- Booking + link: "I'll be taking a brief note and sending you a booking link."
- Booking, no link: "I'll be taking a brief note to get you booked in."
- Quote: "I'll be taking a brief note so [Owner Name] can call you back to discuss what you need."
- General: "I'll be taking a brief note, [Owner Name] will call you back [callback_preference_note]."

### "Please allow me" — non-negotiable through-line
Appears in greeting or AI's first response when taking details. Never disappears. Every register, every tier.

---

## SENSITIVE BUSINESS TYPES — LOCKED

Flag: `is_sensitive boolean` on `business_type_subcategories`. True for: solicitors, medical practices, therapists, counsellors, financial advisers, accountants, GPs, dentists, opticians, regulated professional practices.

Minimal capture mode activates automatically. Cannot be disabled by tenant. Name, number, urgency only. No summary. No transcript. 30-day retention.

Sensitive greeting: "Good morning, [Business Name]. [Owner Name] is unavailable — I'm the AI assistant. Please allow me to take your name and number so [Owner Name] can call you back. For confidentiality reasons I'm not able to take details of your enquiry on this call."

---

## GDPR — LOCKED

Disclosure built into every greeting via "I'll be taking a brief note." No separate injection needed.

**What is never stored:** audio (discarded after transcription), transcript for sensitive types, email body content.

**OWNER ACTIONS required before first paying tenant — NOT build items:**
- ICO registration — ico.org.uk, data processor, ~£40–60, ~20 minutes
- Vapi audio retention — confirm audio NOT retained after transcription in Vapi dashboard. Legal requirement.
- Data covenant document — plain English. Draft with Claude web.
- Tenant privacy policy template — one page. Draft with Claude web.

---

## DATABASE — ALL TABLES DEPLOYED

business_type_categories, business_type_subcategories, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, call_logs, minute_usage, staff_profiles, call_handling_rules, vera_speeches, vera_seen

### Tenants table — key columns
business_name, lead_contact_name, business_email, business_phone, booking_link, opening_hours, business_context, subscription_tier, subcategory_id, vapi_assistant_id, triage_mode, escalation_preference, greeting_message, tone_register, business_outcome_type, callback_preference_note, urgent_callback_mins, urgent_escalation_method, additional_instructions, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, holiday_mode, holiday_return_date, cover_email, email_scan_mode, intervention_time_mins, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, calendar_integration_token, calendar_provider, notify_new_lead, notify_daily_summary, notify_weekly_report

### Pending DB migrations
```sql
-- These have NOT been run yet — run before building dependent features
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number text;
```

---

## FRONTEND — CONFIRMED WORKING

- Dev server: `cd C:\Users\philo\verrante-portal` then `npm run dev` (two separate commands)
- Live: https://verante-portal.vercel.app — auto-deploys on git push to master
- GitHub: https://github.com/philsk1/verante-portal

Key files:
```
src/supabase.js                     — HS256 anon key
src/context/AuthContext.jsx
src/pages/Portal.jsx                — shell, nav, tab routing
src/pages/BusinessProfile.jsx       — tab 1
src/pages/AIBehaviour.jsx           — tab 2
src/pages/ActivityDashboard.jsx     — tab 3 (default)
src/pages/DataAnalytics.jsx         — tab 4
src/pages/PartnersReferrals.jsx     — tab 5
src/pages/AccountSettings.jsx       — tab 6
src/pages/Onboarding.jsx
src/components/HelpMascot.jsx       — Vera owl + dialogue system
src/components/VeraDialogue.jsx     — draggable chat panel
api/vapi-webhook.js                 — end-of-call event handler
api/vapi-sync.js                    — patches Vapi assistant on save
api/_build-prompt.js                — system prompt builder
api/vera-chat.js                    — Vera dialogue (Claude Haiku)
api/greeting-generator.js           — greeting generator (Claude Haiku)
```

---

## PORTAL STRUCTURE

Shell: 64px violet header (#5e3b87) → 44px dark violet nav (#4a2d6e, amber underline on active) → #f7f6f9 content area, maxWidth 940px, padding 2rem. Default tab: Dashboard.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | BUILT |
| AI Behaviour | AIBehaviour.jsx | BUILT |
| Dashboard | ActivityDashboard.jsx | BUILT |
| Analytics | DataAnalytics.jsx | BUILT |
| Partners & Referrals | PartnersReferrals.jsx | BUILT |
| Account | AccountSettings.jsx | BUILT |

---

## VAPI — BUILT AND CONFIRMED WORKING

- `vapi-webhook.js` — end-of-call: looks up tenant by vapi_assistant_id, writes call_logs + leads + referral_log. Applies minimal storage for sensitive business types.
- `vapi-sync.js` — PATCHes Vapi assistant on every AI Behaviour save. Fetches subcategory sensitivity, passes isSensitive to prompt builder.
- `_build-prompt.js` — full prompt builder. Layer 1 constants, tone register, greeting, "please allow me" through-line, call type rules, sensitive override, provisional booking instruction.

Structured data extracted per call: triage_outcome (7 values), caller_name, referred_to.

Notification format (logged, not yet dispatched):
- Standard: `[Business Name] — New call / Caller: [name] · [number] / Need: [summary] / Resolution: [outcome]`
- Urgent: `URGENT — [X] minute response / Caller: [name] · [number] / Need: [summary] / Resolution: Escalated`

---

## VERA — THE OWL MASCOT

Character: mature, kindly, male owl. Wise, unhurried, warm without being soft.

Three modes: hover explains (data-help tooltips), proactive speeches (shown once per tenant), glowing zones (need more help → draggable dialogue panels).

`vera_speeches` table populated with first-visit speeches for all 6 tabs.

Voice: ElevenLabs pre-rendered MP3s. Currently no audio — text only.

---

## VISUAL LANGUAGE — LOCKED

All inline styles. No CSS files. No CSS variables.

| Token | Value |
|-------|-------|
| Violet primary | #5e3b87 |
| Violet dark | #4a2d6e |
| Amber | #f0a500 |
| Page bg | #f7f6f9 |
| Card bg | #ffffff / border 0.5px solid rgba(94,59,135,0.1) |
| Success | #3db87a |
| Text | #1a1a1a · #666 · #aaa |

Fonts: Syne 700 (headings, logo, numbers). DM Sans 300/400/500 (body). Google Fonts in index.html.

Primary button: #f0a500 bg, #1a0533 text, borderRadius 8px.
Disabled: #f5d98a bg, #7a5c1a text.
Secondary: white bg, violet border.
Locked sections: blur(3px) + opacity 0.45 + absolute white badge.

---

## CODE CONVENTIONS

- `.maybeSingle()` not `.single()` — prevents 406 on 0 rows
- All Supabase queries in try/catch with finally { setLoading(false) }
- Tab components receive `onNavigate` prop
- `isProfessional = tier === 'professional'`, `isEnterprise = ['enterprise','bespoke'].includes(tier)`, `isProfessionalOrAbove = isProfessional || isEnterprise`
- `CLIENT_LIMIT = { light: 20, standard: 50, professional: 100, enterprise: 200, bespoke: 200 }`
- All inline styles. No CSS files.
- `data-help="..."` on all section headings and key UI elements (Vera reads these)
- Supabase anon key safe in frontend. Service role key NEVER in frontend.
- PowerShell: always two separate commands, no &&

---

## SECTION 1 — COMPLETED

- [x] All 6 portal tabs — fully built and wired to Supabase
- [x] Auth guards — Portal ↔ Onboarding bidirectional
- [x] Visual language — Login, Signup, Onboarding, Portal all on violet palette
- [x] Deployed to Vercel — auto-deploys on git push to master
- [x] Vapi webhook — writes call_logs, leads, referral_log. End-to-end confirmed.
- [x] Vapi sync — patches Vapi assistant on every AI Behaviour save
- [x] System prompt builder — Layer 1 constants, tone, greeting, please-allow-me, call rules, filters
- [x] Vera mascot — hover explains, proactive speeches, glowing zones, draggable dialogue (Claude Haiku)
- [x] DB migrations — all tenants columns, staff_profiles columns, is_sensitive flag, vera tables
- [x] Tier structure — Professional £69 added, Enterprise £249, upgrade paths updated across all tabs
- [x] Greeting architecture — tone toggle cards with live preview, protected modal, Restore Default, greeting generator (Claude Haiku endpoint)
- [x] Business outcome type — onboarding step 1 + AI Behaviour tab, wired to prompt builder
- [x] Urgent callback config — response mins, Text/Email/Both escalation, call return preference field
- [x] Additional instructions — free text field, injected at end of prompt, never overrides tone or Layer 1
- [x] Sensitive business types — is_sensitive flag on subcategories, minimal capture mode in prompt builder + webhook, onboarding disclosure note
- [x] Holiday mode + cover email scanning — toggle, return date, cover email, scan mode (none/subject/full), intervention timing — Account tab
- [x] Provisional booking — Professional+ section in AI Behaviour, toggle + rule + slots/buffer/window, injected into prompt, locked for lower tiers
- [x] Vera speeches — first-visit speech data populated for all 6 tab context keys

---

## SECTION 2 — IN PROGRESS

Nothing currently in progress.

---

## SECTION 3 — REQUIRED
### In priority order. Execute sequentially.

---

### TASK 1 — Staff extension recognition (Enterprise only)

Add to BusinessProfile.jsx, Employee Profiles section:
- `direct_line_did` text field per staff member — the DID number assigned to their extension
- `cover_staff_id` dropdown — select covering staff member (from same tenant's staff_profiles)

Add to `_build-prompt.js`:
When a staff member has `direct_line_did` set, inject this routing instruction:
> "If the caller has come through on [Staff Name]'s direct line ([DID number]), greet them: 'Good morning, you've reached [Business Name]. You've come through on [Staff Name]'s line — please allow me to take your details and make sure [Staff Name] gets back to you.' If [Staff Name] has a cover staff member configured and is listed as unavailable, say: '[Staff Name] is unavailable today — [Cover Name] is covering. Please allow me to take your details and make sure [Cover Name] gets back to you.'"

Fetch staff_profiles with direct_line_did values in vapi-sync.js and pass to prompt builder.

---

### TASK 2 — GDPR account tab additions

Add to AccountSettings.jsx, new subsection within Account Details or as a standalone section:

- **Data retention period** — selector: 30 days / 90 days (default) / 1 year. Stores to tenants.data_retention_days (new column). Sensitive types always capped at 30 days regardless.
- **Export my data** — button. For now: show a toast "We'll email your data export within 24 hours." (placeholder — no backend yet).
- **Delete my data** — button. Two-stage confirmation modal. For now: show confirmation then toast "Deletion request received — your account will be closed within 48 hours." (placeholder).
- **Privacy policy** — link to download template (placeholder URL for now).

DB migration needed:
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days integer default 90;
```

---

### TASK 3 — RLS re-enable

**Do this before first paying tenant — not before.**

1. Run the existing `supabase_rls.sql` in Supabase SQL editor
2. Test: log in as a real tenant user, confirm all 6 tabs load correctly
3. Test: confirm data from another tenant is not accessible
4. If any query returns 0 rows unexpectedly, the policy is the culprit — debug with `auth.uid()` check
5. Mark done only after confirmed working end-to-end

The legacy HS256 anon key is confirmed to work with `auth.uid()`. The ES256 sb_publishable_ key does NOT — never switch to it.

---

### TASK 4 — Stripe billing

Wire upgrade cards in AccountSettings.jsx to Stripe Checkout. On successful payment:
- Stripe webhook updates `tenants.subscription_tier`
- Portal refreshes tier, locked sections unlock

Steps:
1. Create Stripe products for Standard, Professional, Enterprise
2. Create `api/stripe-webhook.js` — handles `checkout.session.completed`, updates tenant tier
3. Create `api/create-checkout-session.js` — takes tier, returns Stripe checkout URL
4. Wire upgrade buttons in AccountSettings.jsx to call create-checkout-session
5. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel env vars

---

### TASK 5 — Support chat (Account tab)

The UI is built in AccountSettings.jsx — a chat interface with a placeholder response. Wire it to Claude API with tenant context injected.

Create `api/support-chat.js`:
- POST { tenantId, messages }
- Fetches tenant: business_name, subscription_tier, call stats (count from call_logs), lead count, active since date
- System prompt: "You are a helpful support assistant for Verrante, an AI call handling platform. The tenant you are supporting is [business_name] on the [tier] plan, active since [date]. They have handled [N] calls and captured [N] leads. Answer questions about portal settings, AI behaviour, billing, and how Verrante works. Be concise and direct."
- Returns Claude Haiku response

Wire the chat UI in AccountSettings.jsx to POST to /api/support-chat.

---

## PARKED FEATURES — SPECCED, NOT YET BUILT

- **Call sample recordings** — 15 MP3s (5 types × 3 modes), ElevenLabs, play from AI Behaviour tab mode selector
- **Public Playground** — standalone no-auth page, language × dialect, 40 pre-rendered MP3s
- **Referred signup surface** — /signup?ref=TENANTCODE, captures referred_by_tenant_id
- **Staff calendar integration** — CalDAV per staff member, availability checking for cover routing
- **Twilio SMS dispatch** — notification sending (format already built in vapi-webhook.js, needs Twilio wiring)
- **Weekly/monthly email reports** — notify_weekly_report toggle exists, backend not built
- **Number blocking** — table exists, UI placeholder built, logic pending
- **CSV import** — for existing client data
- **Pricing intelligence coaching** — competitor mention tracking, win rate analysis
- **n8n migration** — at 30 tenants, replace Make.com
- **Multi-site / franchise** — post revenue
- **Vera audio** — ElevenLabs pre-renders per speech, currently text only
- **100 business type seed data** — content doc exists (verrante-100-business-types-v2.md)
- **i18n scaffolding** — before international expansion
- **Domain** — verrante.com confirmation

---

## OWNER ACTIONS — NOT BUILD ITEMS

1. Vapi audio retention — disable in Vapi dashboard before first live call
2. ICO registration — ico.org.uk, data processor, ~£40–60/year
3. Data covenant document — draft with Claude web
4. Privacy policy template — one page for tenants, draft with Claude web
5. ElevenLabs voice for Vera — audition mature warm male voices
6. Domain — verrante.com confirmation
7. Terms of service — draft with Claude web
