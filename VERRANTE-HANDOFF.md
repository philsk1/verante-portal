# VERRANTE — PROJECT HANDOFF DOCUMENT
Paste this in full at the start of every new conversation thread.
Last updated: 2026-06-04

---

## WHAT VERRANTE IS

A multi-tenant AI call handling and lead capture SaaS for solo operators and micro-service businesses in the UK — hair salons, tradespeople, sole traders. The AI answers missed calls, triages caller intent, captures lead details, refers out-of-scope callers to partner businesses, and routes the caller to a booking link or callback. The owner sees everything in a portal.

Working name — not legally confirmed yet.
Core sales framing — LOCKED: "Never miss another lead."

The product is not a call answering service. It is a CRM that happens to start with a phone call. Every downstream feature — follow-up messaging, pricing intelligence, referral network, win rate coaching — compounds on that data foundation.

---

## STRATEGIC FOUNDATIONS — LOCKED

Price point is deliberately aggressive. Designed to eliminate decision friction for sole traders who have never bought software. Traction and data flywheel take priority over margin at this stage.

Flywheel: better system → tenant leans on it more → more data → smarter system → more value → more referrals → network density increases → each tenant gets more inbound referrals → leaning increases further.

Referral psychology: a tenant who has sent four referrals out actively demands reciprocation. This creates membership culture, not just word of mouth. The referral network is owned entirely by the tenant — Verrante is the infrastructure that makes it visible and reciprocal.

Advertising principle: at the right moment every penny of profit goes into advertising. Every infrastructure and UX decision carries an implicit advertising readiness test: could this handle ten times the load tomorrow.

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator — reads decisions, doesn't just execute. Tech hires deliberately deferred. Uses Claude Code (VSCode extension) for all development.

Risk window is 50–500 tenants. Three protections: AI handles support, agencies over employees in this window, any human hire works the human layer not the technical one.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools. PowerShell does not support && — always run as two separate commands. Bash tool preferred when available.

---

## TIER STRUCTURE — LOCKED

| Tier | Price | Concurrent | Minutes/mo | Key features |
|------|-------|-----------|------------|--------------|
| Light | £29/month | 1 | 60 | Core call handling, referrals |
| Standard | £49/month | 1 | 150 | Core + higher volume, referrals |
| Professional | £69/month | 2 | 250 | Two concurrent, calendar, sensitive data mode, referrals |
| Enterprise | £249/month | 3+ | 700 | Full staff routing, calendar, provisional booking, advanced handling — NO referral network |
| Bespoke | Contact us | Custom | Custom | Franchise, multi-site |

Overage: £0.18/min

**Enterprise — no referral network.** Enterprise value is entirely from product capability. The flywheel that drives value for Light/Standard/Professional does not apply at Enterprise.

**Professional tier sell:** "You're on a call, another comes in, they hang up. Verrante catches the second call while you're on the first." That is the pitch in one sentence.

Tier checks in code: `isProfessional = tier === 'professional'`, `isEnterprise = tier === 'enterprise' || tier === 'bespoke'`, `isProfessionalOrAbove = isProfessional || isEnterprise`

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
| Voice generation | ElevenLabs (Vera audio, playground samples) |

---

## SUPABASE — CONFIRMED DETAILS

- Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co
- Anon key (legacy HS256 — use this, NOT the sb_publishable_ format):
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ
- Service role key: in Vercel environment variables only. NEVER in frontend code.

### RLS STATUS — CONFIRMED ENABLED
RLS is enabled on all critical tables. Confirmed 2026-06-03 via SQL query. All tenant data tables secured. Tables without RLS (follow_up_messages, minute_usage, tenant_credits etc.) are not yet in active use — add RLS when those features are built (Stripe session). No blocker for current development.

---

## AI INSTRUCTION ARCHITECTURE — LOCKED

Three layers govern every system prompt. Never deviate from this structure.

**Layer 1 — Verrante owned. Injected into every prompt. Never editable or visible to tenant.**

Core values instruction (verbatim in every prompt):
> "You are a warm, professional, and considerate assistant. You speak in human terms at all times — with kindness, willingness, and genuine care for the person you are speaking with. You are never robotic, never bureaucratic, never cold. You do not perform warmth — you express it naturally through the way you phrase things, the pace you set, and the care you take with every caller. Even in your most formal register you remain considerate and human. You never claim to be a person but you always behave like one worth trusting."

Judgement override instruction (verbatim in every prompt):
> "You are an intelligent assistant, not a rule-following robot. If a caller's tone, words, or situation clearly falls outside the scope of normal business enquiries — personal urgency, distress, safety concerns, or anything that common sense tells you requires immediate human attention — escalate immediately regardless of any other instructions. Always err on the side of the human."

**Layer 2 — Tenant owned but protected.** Greeting message and triage context. Pre-populated from seed data. Editable via single warning modal. Restore Default always available. Never auto-saves.

**Layer 3 — Tenant owned, freely editable.** Services, opening hours, call type rules, emergency keywords, callback preference, everything else.

---

## THE GREETING — LOCKED

### Structure (three components only)
1. Where you've reached and who's unavailable
2. AI introduces itself as virtual assistant
3. "I'll be taking a brief note" (GDPR disclosure) + invitation to speak

### Warm register — default for all tiers
> "Good morning, [Business Name]. [Owner Name] is busy — I'm [his/her] virtual assistant. I'll be taking a brief note of your enquiry to make sure nothing gets missed. How can I help you?"

### Formal register — optional via tone toggle, all tiers
> "Good morning. You have reached [Business Name]. [Owner Name] is currently unavailable — I am [his/her] virtual assistant. I will be taking a brief note of your enquiry to ensure it receives [Owner Name]'s personal attention. How may I assist you?"

### Tone toggle — binary choice, all tiers
Stored as `tone_register text default 'warm'` — values: 'warm' | 'formal'. No gradations.

### Four greeting resolution endings (appended based on config)
- Booking business with booking link: *"...I'll be taking a brief note of your enquiry and sending you a booking link."*
- Booking business without link: *"...I'll be taking a brief note of your enquiry to get you booked in."*
- Quote business: *"...I'll be taking a brief note of your enquiry so [Owner Name] can call you back to discuss what you need."*
- General callback: *"...I'll be taking a brief note of your enquiry, [Owner Name] will call you back [Callback Timeframe]."*

### Greeting generator
In AI Behaviour tab → free text field → "Write my greeting" button → API call to Claude with locked system prompt → populates greeting field → tenant edits or regenerates → Save commits.

---

## "PLEASE ALLOW ME" — THE THROUGH-LINE — LOCKED

Non-negotiable across every register, every business type, every tier. Appears in the greeting or in the AI's first response when taking details. Never disappears entirely from the interaction.

In warm register: appears in the greeting naturally.
In formal register: *"Please allow me to record your name and contact details."*

Completion constructions (AI selects most contextually appropriate):
- Please allow me to take your details to get you booked in
- Please allow me to take your details, [Owner Name] will call you back [Callback Timeframe]
- Please allow me to take your details to make sure [Owner Name] gets back to you today
- Please allow me to take your details to get this sorted for you
- Please allow me to take your details to make sure nothing gets missed
- Please allow me to record the details of your enquiry so that it may receive [Owner Name]'s personal attention

---

## CALL HANDLING ARCHITECTURE — LOCKED

### Business outcome type
Set in onboarding step 1. Stored as `business_outcome_type text default 'quote'` — values: 'booking' | 'quote'.
- "I take bookings and appointments" → 'booking'
- "I discuss, quote, and arrange" → 'quote'

### The seven resolution types
1. Booking link sent — caller wants appointment, AI takes name/number, sends link by SMS
2. Callback confirmed — name, number, brief details, owner calls back within configured timeframe
3. Details taken, owner notified — rich capture, substantive notification
4. Referral out — outside services list, warm decline, partner named if configured
5. Escalation — emergency keyword or AI judgement override
6. Information only — hours, prices, location answered from tenant record
7. Hard close — spam, autodialler, non-engaging caller, polite end

### Callback configuration
- `callback_preference_note text` — free text: "I return calls after 3pm same day". AI reads and applies judgement.
- `urgent_callback_mins integer default 60` — maximum response time for urgent calls
- `urgent_escalation_method text default 'both'` — values: 'sms' | 'email' | 'both'

### Additional instructions field
Bottom of call type rules matrix in AI Behaviour tab. Free text. Overrides default behaviour for specific situations. Does NOT override tone or Layer 1. Ever.

---

## SENSITIVE BUSINESS TYPES — LOCKED

Flag: `is_sensitive boolean default false` on `business_type_subcategories`. Set true for: solicitors, medical practices, therapists, counsellors, financial advisers, accountants, private GPs, dentists, opticians, any regulated professional practice.

**Minimal capture mode** — activates automatically when subcategory is_sensitive = true. Cannot be disabled by tenant.

AI instruction for sensitive types:
> "This business operates under professional confidentiality obligations. Capture the caller's name, contact number, and urgency level only. Do not ask about the nature of their enquiry beyond urgency. Do not summarise, record, or store any details of why they are calling. If the caller volunteers sensitive information, do not repeat it, store it, or reference it."

Sensitive greeting:
> "Good morning, [Business Name]. [Owner Name] is unavailable — I'm the AI assistant. Please allow me to take your name and number so [Owner Name] can call you back. For confidentiality reasons I'm not able to take details of your enquiry on this call."

Data stored for sensitive types: caller name, number, urgency flag, timestamp only. No AI summary. No transcript. Retention 30 days.

---

## GDPR — LOCKED

Disclosure: built into every greeting via "I'll be taking a brief note of your enquiry." Always present. No separate injection.

**What is stored:** caller name and number, AI-generated summary, call outcome, duration and timestamp.

**What is never stored:** audio (discarded immediately after transcription), full transcript for sensitive types, email body content, any details beyond name/number/urgency for sensitive types.

Data retention defaults: standard 90 days, sensitive 30 days. Both configurable in Account tab.

**OWNER ACTIONS REQUIRED before first paying tenant:**
- ICO registration — ico.org.uk, data processor, ~£40-60, ~20 minutes
- Vapi audio retention — confirm audio NOT retained after transcription in Vapi dashboard. Legal requirement.
- Data covenant document — plain English, four sections. Draft with Claude web when ready.
- Tenant privacy policy template — draft with Claude web when ready.

---

## DATABASE — ALL TABLES DEPLOYED

business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules

### call_logs columns (confirmed)
id, tenant_id, caller_id, caller_phone, call_intent, call_outcome, ai_summary, duration_seconds, transcript, created_at

### Pending DB migrations (run before building dependent features)

```sql
-- Tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tone_register text default 'warm';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_outcome_type text default 'quote';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS callback_preference_note text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS urgent_callback_mins integer default 60;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS urgent_escalation_method text default 'both';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS holiday_mode boolean default false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS holiday_return_date date;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cover_email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_scan_mode text default 'none';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS intervention_time_mins integer default 60;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS provisional_booking_enabled boolean default false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS provisional_booking_rule text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_slots_to_offer integer default 2;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_buffer_mins integer default 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_confirmation_window_mins integer default 120;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS calendar_integration_token text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS calendar_provider text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number text;

-- Staff profiles
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS direct_line_did text;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS cover_staff_id uuid references staff_profiles(id);
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS calendar_integration_token text;

-- Business type subcategories
ALTER TABLE business_type_subcategories ADD COLUMN IF NOT EXISTS is_sensitive boolean default false;

-- Vera tables (new)
CREATE TABLE IF NOT EXISTS vera_speeches (
  id uuid primary key default gen_random_uuid(),
  context_key text unique not null,
  speech_text text not null,
  audio_url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS vera_seen (
  tenant_id uuid references tenants(id),
  speech_key text not null,
  seen_at timestamptz default now(),
  primary key (tenant_id, speech_key)
);
```

---

## FRONTEND — CONFIRMED WORKING

- Dev server: `cd C:\Users\philo\verrante-portal` then `npm run dev` (two separate commands)
- Runs on http://localhost:5173 (may shift to 5174/5175 if ports occupied)
- Deployed: https://verante-portal.vercel.app — auto-deploys on git push to master
- GitHub: https://github.com/philsk1/verante-portal

Key files:
- `src/supabase.js` — HS256 anon key
- `src/context/AuthContext.jsx`
- `src/pages/` — Login, Signup, Onboarding, Portal, plus all 6 tab components
- `src/components/HelpMascot.jsx` — Vera owl mascot
- `api/vapi-webhook.js` — Vercel serverless function, processes Vapi end-of-call events
- `api/vapi-sync.js` — patches Vapi assistant via Management API on Business Profile / AI Behaviour save
- `api/_build-prompt.js` — system prompt builder, reads full tenant config from DB
- `api/vapi-assistant-request.js` — dynamic assistant config for phone number routing (future)
- `public/test-call.html` — test page with hardcoded test Vapi credentials (NOT production)

---

## PORTAL STRUCTURE — ALL 6 TABS BUILT

Shell: 64px violet header (#5e3b87, logo left, email+signout right) → 44px dark violet nav strip (#4a2d6e, amber underline on active) → #f7f6f9 content area, maxWidth 940px, padding 2rem. Default tab: Dashboard.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | BUILT |
| AI Behaviour | AIBehaviour.jsx | BUILT — needs additions |
| Dashboard | ActivityDashboard.jsx | BUILT |
| Analytics | DataAnalytics.jsx | BUILT |
| Partners & Referrals | PartnersReferrals.jsx | BUILT |
| Account | AccountSettings.jsx | BUILT — needs additions |

Auth flow: Login → Signup → Onboarding (creates tenant + membership) → Portal. Bidirectional guards in place.

---

## TAB DETAIL — BUSINESS PROFILE

1. **Business Details** — name, phone, email, booking link, address, opening hours, business context → tenants
2. **Your Services** — chip list. Helper text: *"Tell us what you do. Broad means more calls. Specific means fewer, better ones."* → services table
3. **Partner Services** — chip list of services AI warm-refers out → banned_services table
4. **Client Directory** — known clients, specialist instructions injected into AI context → callers + caller_tenant_relationships. Quotas: Light 20 / Standard 50 / Professional+Enterprise 200.
5. **Employee Profiles** — Enterprise only → staff_profiles

---

## TAB DETAIL — AI BEHAVIOUR

Current sections (built):
1. Call Handling — triage mode + escalation preference
2. Call Type Rules — 5 call type cards
3. Emergency Keywords
4. Greeting Message
5. Call Filtering
6. Number Blocking

**Additions needed (from briefing):**
- Tone toggle — warm/formal, all tiers, top of tab
- Business outcome type — booking/quote (also in onboarding step 1)
- Callback preference note — free text field
- Urgent callback mins — number field
- Additional instructions — free text, bottom of call type rules matrix
- Protected field modal on greeting (single warning, restore default button)
- Greeting generator — "Write my greeting" → Claude API call
- Provisional booking section — Professional and Enterprise only
- Calendar integration — Professional and Enterprise only
- Holiday mode section — all tiers
- Email cover scanning configuration

---

## TAB DETAIL — DASHBOARD (ActivityDashboard.jsx)

- 4 stat cards: Calls today, New leads (7 days), Referrals sent (7 days), Minutes used this month
- Recommendation card — 4 priority states
- Recent calls feed — last 8, outcome badge, AI summary quoted
- Two-column: Leads requiring action + Referrals sent today

---

## TAB DETAIL — ANALYTICS (DataAnalytics.jsx)

- 3 headline numbers: Total calls, Lead capture rate %, Average call duration
- 4 tier-gated feature cards (Enterprise unlocks all): Pricing Intelligence, Call Outcome Breakdown, Caller Patterns, Competitor Intelligence

---

## TAB DETAIL — PARTNERS & REFERRALS (PartnersReferrals.jsx)

LOCKED: Partner network unlimited at Light, Standard, Professional. Enterprise has NO referral network.

- Partner Network — name, phone, specialty → referral_service_map. Network strength label.
- Referral Code — Syne display, copy, QR via api.qrserver.com
- Credits — 1 referral = 1 free month, stackable, no expiry
- Network Activity — outbound count + £ estimated value (£75/referral)

---

## TAB DETAIL — ACCOUNT (AccountSettings.jsx)

Current (built): Plan & Billing (Stripe placeholder), Account Details, Notifications, Feedback, Support chat (UI only), Cancel flow.

**Additions needed:** Data retention period selector, Export my data button, Delete my data button, Privacy policy template download.

**Tier pricing to update:** Professional £69, Enterprise £249.

---

## VAPI — BUILT AND CONFIRMED WORKING

`api/vapi-webhook.js` — on `end-of-call-report`:
1. Looks up tenant by `vapi_assistant_id`
2. Finds or creates caller record
3. Writes call_logs (duration_seconds, ai_summary, call_outcome, caller_phone, transcript)
4. Writes leads if outcome is lead_captured or booked
5. Writes referral_log if outcome is referred_out

`api/vapi-sync.js` — PATCHes Vapi assistant via Management API. Fires on Business Profile save and AI Behaviour save. Requires `VAPI_PRIVATE_KEY` in Vercel env vars.

Structured data extracted: triage_outcome (lead_captured/booked/referred_out/filtered/escalated/hard_close/spam), caller_name, referred_to.

**`_build-prompt.js` needs updating** to incorporate Layer 1 core values + judgement override + "please allow me" through-line + tone register logic.

End-to-end confirmed: call made → webhook fires → DB written → Dashboard shows call with outcome badge and AI summary. ✅

---

## VERA — THE OWL MASCOT

Character: mature, kindly, male owl. Wise, unhurried, warm without being soft.

Animation spec — CRITICAL: fly in 0.6s, settle 0.4s, speaks immediately, fly off 0.4s. Under 1 second to first word. Non-negotiable.

Voice: ElevenLabs, mature warm male, pre-rendered MP3 per speech, stored in Supabase Storage.

When Vera appears: onboarding steps, empty states, first-time milestones, help icon click.
When Vera does not appear: after speech seen once (tracked in vera_seen table), never uninvited repeat.

Speech style: max 3 sentences, explains the why, ends with gentle forward nudge, never condescending.

Tables needed: `vera_speeches` (context_key, speech_text, audio_url), `vera_seen` (tenant_id, speech_key, seen_at). SQL in pending migrations above.

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
| Amber dark | #b07a00 |
| Page bg | #f7f6f9 |
| Card white | #ffffff |
| Card border | 0.5px solid rgba(94,59,135,0.1) |
| Success | #3db87a |
| Text | #1a1a1a · #666 · #aaa |

Fonts: Syne 700 (headings, logo, stat numbers). DM Sans 300/400/500 (body, UI). Both via Google Fonts in index.html.

Primary button: #f0a500 bg, #1a0533 text, borderRadius 8px.
Disabled button: #f5d98a bg, #7a5c1a text.
Secondary button: white bg, violet border, violet text.
Locked sections: blur(3px) + opacity 0.45 + absolute white badge.
Logo: "Verrante" Syne 700 + 7px amber dot (marginLeft 3, marginBottom 8).

---

## CODE CONVENTIONS

- `.maybeSingle()` not `.single()` — prevents 406 errors on 0 rows
- All Supabase queries wrapped in try/catch with finally { setLoading(false) }
- Tab components receive `onNavigate` prop for cross-tab navigation
- Tier checks: `isEnterprise = tier === 'enterprise' || tier === 'bespoke'`, `isProfessionalOrAbove = tier === 'professional' || isEnterprise`
- Client limit: `CLIENT_LIMIT = { light: 20, standard: 50, professional: 200, enterprise: 200, bespoke: 200 }`
- `data-help` attributes on all section headings and key UI elements (for Vera mascot)

---

## CURRENT BUILD STATE

### Done
- [x] All 6 portal tabs — fully built and wired
- [x] Auth guards — Portal ↔ Onboarding bidirectional
- [x] Vera mascot — owl, click to wake, floats to data-help elements
- [x] Visual language — Login, Signup, Onboarding, Portal all on violet palette
- [x] Deployed to Vercel — auto-deploys on git push
- [x] Notification preferences — persisted to tenants table
- [x] Vapi webhook — writes call_logs, leads, referral_log
- [x] vapi-sync — patches Vapi assistant on every profile/behaviour save
- [x] System prompt builder — reads full tenant config from DB
- [x] call_logs schema aligned — duration_seconds, ai_summary, call_outcome, caller_phone, transcript
- [x] Dashboard end-to-end confirmed — calls appear with outcome badge and AI summary
- [x] RLS confirmed enabled on all critical tables

### Next (in priority order)
- [ ] DB migrations — run all pending column additions above
- [ ] Update `_build-prompt.js` — add Layer 1 instructions, "please allow me" through-line, tone register
- [ ] Tone toggle — AI Behaviour tab, all tiers
- [ ] Business outcome type — onboarding step 1 + AI Behaviour tab
- [ ] Callback preference fields — urgent_callback_mins, callback_preference_note
- [ ] Stripe — billing, upgrade flow, new tier pricing (Professional £69, Enterprise £249)
- [ ] Support chat — Claude API endpoint + tenant context injection
- [ ] Sensitive business type flag — subcategories table + minimal capture mode in prompt builder
- [ ] Protected field modal — greeting and triage context

---

## PARKED FEATURES — SPECCED, LOCKED, NOT YET BUILT

- **Greeting generator** — "Write my greeting" button → Claude API, locked system prompt
- **Email cover scanning** — three options (none/subject/full), intervention timing
- **Holiday mode** — toggle + return date, affects greeting and resolution
- **Provisional booking** — Professional and Enterprise only, CalDAV, tenant plain English rule
- **Calendar integration** — CalDAV, Google/Apple/Outlook, Professional and Enterprise
- **Vera speeches + audio** — ElevenLabs pre-renders, vera_speeches table
- **Call sample recordings** — 15 MP3s (5 types × 3 modes), ElevenLabs
- **Public Playground** — standalone, no auth, 40 pre-rendered MP3s
- **Referred signup surface** — /signup?ref=TENANTCODE
- **Staff extension recognition** — Enterprise, direct_line_did per staff member
- **Staff coverage logic** — cover_staff_id, calendar-based availability

---

## FUTURE TASKS — PARKED

- Twilio SMS integration
- Weekly/monthly email reports
- Number blocking table + UI completion
- CSV import for existing client data
- GDPR Account tab features (export, delete, retention selector)
- Domain confirmation (verrante.com)
- Terms of service
- Bespoke tier enquiry route
- Multi-site and franchise architecture (post revenue)
- Pricing intelligence coaching feature
- n8n migration at 30 tenants
- Competitor intelligence and pricing intelligence — tables exist, AI writing pending
- i18n scaffolding before international expansion
- 100 business type seed data — content doc exists (verrante-100-business-types-v2.md)
