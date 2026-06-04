# VERRANTE — COMPLETE PROJECT HANDOFF DOCUMENT V9
Paste this in full at the start of every new conversation thread.
Last updated: 2026-06-04

---

## WHAT VERRANTE IS

A multi-tenant AI call handling and lead capture SaaS platform targeting solo operators and micro-service businesses in the UK. Hair salons, tradespeople, local service providers. The core product answers missed calls, triages caller intent, captures lead details, refers out-of-scope callers to partner businesses, and routes the caller to a booking link or callback.

Working name: Verrante. Name not yet legally confirmed.

---

## STRATEGIC FOUNDATIONS — LOCKED

Price point is deliberately aggressive. Designed to eliminate decision friction for sole traders who have never bought software. Traction and data flywheel take priority over margin at this stage.

The product is not a call answering service. It is a CRM that happens to start with a phone call. The phone call is the data ingestion point. Every downstream feature — follow-up messaging, pricing intelligence, referral network, win rate coaching — compounds on that foundation.

The flywheel: better system → tenant leans on it more → more data → smarter system → more value → more referrals → network density increases → each tenant gets more inbound referrals → leaning increases further.

Referral psychology: a tenant who has sent four referrals out actively demands reciprocation. This creates membership culture not just word of mouth. The referral network is owned entirely by the tenant — Verrante is the infrastructure that makes it visible and reciprocal.

Core sales framing — LOCKED: "Never miss another lead." The anxiety a busy tradesperson feels about missing a call while they are under a sink — that is the problem this solves.

---

## FOUNDER ROLE — LOCKED

Strategy, metadata, steering on percentage gains, keeping architecture ahead of the next crunch. Not support, not wet-nursing, not operations.

Tech hires deliberately deferred. Risk window is 50–500 tenants. Three protections: AI handles support, agencies over employees in this window, any human hire works the human layer not the technical one.

Founder background: Philip Keating. 27 years running a physical manufacturing business in print. Peaked at 55 staff. Scaling instincts significantly more reliable than a first-time founder.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools. PowerShell does not support && — always run two separate commands. Always uses Bash tool when available.

---

## TIER STRUCTURE — LOCKED

| Tier | Price | Concurrent calls | Minutes |
|------|-------|-----------------|---------|
| Light | £29/month | 1 | 60 |
| Standard | £49/month | 1 | 150 |
| Enterprise | £99/month | 3+ | 400 |
| Bespoke | Contact us | Custom | Custom |

Overage: £0.18/min

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
| Vera AI | Claude Haiku (Anthropic API, vera-chat endpoint) |

---

## SUPABASE — CONFIRMED DETAILS

Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co

Anon key (legacy HS256 — use this, not the sb_publishable_ format):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ

GitHub: https://github.com/philsk1/verante-portal
Live URL: https://verante-portal.vercel.app

### CRITICAL — RLS STATUS

RLS is currently DISABLED on all tables. Deliberate pre-launch decision. The new Supabase sb_publishable_ key format caused ES256 JWT tokens that PostgREST cannot validate — auth.uid() returned null in all policies. Switched to legacy HS256 anon key (above). RLS policies are written and ready using pattern:
```sql
using (tenant_id in (select tenant_id from tenant_memberships where user_id = auth.uid()))
```
Must be verified and re-enabled before go-live. NOT a blocker for development.

---

## DATABASE — COMPLETE AND DEPLOYED

All tables live:
business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules, vera_speeches, vera_seen

### KEY TABLE SCHEMAS

**tenants** — key columns:
business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords (text[]), tone_register, business_outcome_type, callback_preference_note, urgent_callback_mins, additional_instructions, vapi_assistant_id, tier

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

**vera_speeches:** context_key text (unique), speech_text text
**vera_seen:** tenant_id uuid, speech_key text, seen_at timestamptz

---

## FRONTEND — CONFIRMED WORKING

Dev server: run two commands separately — `cd C:\Users\philo\verrante-portal` then `npm run dev`
Runs on http://localhost:5173 (may shift to 5174/5175 if ports occupied)

Key files:
```
src/supabase.js                      — legacy HS256 anon key hardcoded (correct)
src/context/AuthContext.jsx
src/pages/Login.jsx, Signup.jsx, Onboarding.jsx, Portal.jsx
src/pages/BusinessProfile.jsx, AIBehaviour.jsx, ActivityDashboard.jsx
src/pages/DataAnalytics.jsx, PartnersReferrals.jsx, AccountSettings.jsx
src/components/HelpMascot.jsx        — Vera owl + full dialogue system
src/components/VeraDialogue.jsx      — draggable AI chat panel
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

### Environment vars (Vercel + local .env)

| Var | Used by |
|-----|---------|
| SUPABASE_SERVICE_ROLE_KEY | vapi-webhook.js, vapi-sync.js |
| VAPI_PRIVATE_KEY | vapi-sync.js |
| ANTHROPIC_API_KEY | vera-chat.js |

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

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | BUILT |
| AI Behaviour | AIBehaviour.jsx | BUILT + Vapi sync wired |
| Dashboard | ActivityDashboard.jsx | BUILT, confirmed end-to-end |
| Analytics | DataAnalytics.jsx | BUILT |
| Partners & Referrals | PartnersReferrals.jsx | BUILT |
| Account | AccountSettings.jsx | BUILT |

---

## TAB DETAIL — BUSINESS PROFILE

Five sections:
1. Business Details — name, phone, email, booking link, address, opening hours, business context → tenants
2. Your Services — chip list → services table
3. Partner Services — chip list of referred-out services → banned_services table (rename pending)
4. Client Directory — known clients with specialist instructions. Light: 20, Standard: 50, Enterprise: 200. Stored in callers + caller_tenant_relationships. Quota bar with amber warning at limit.
5. Employee Profiles — Enterprise only. Name, role, specialist services, direct line, active toggle → staff_profiles

---

## TAB DETAIL — AI BEHAVIOUR

Six sections:
1. Call Handling (global) — triage_mode (Strict/Balanced/Open), escalation_preference → tenants
2. Call Type Rules — 5 call type cards (new_customer, partner_service, sales_call, supplier_delivery, invoice_authorities). Each: mode selector, booking link/callback/email/goodbye toggles, email address with "Use mine", additional instructions. → call_handling_rules upsert
3. Emergency Keywords — chip list → tenants.emergency_keywords (text[])
4. Greeting Message — custom or system default → tenants.greeting_message
5. Call Filtering — spam detection, sales call handling, autodialler detection, instant-save → tenants
6. Number Blocking — Light: locked. Standard+: coming soon

Additional fields wired to tenants:
- tone_register (warm/formal)
- business_outcome_type (quote/booking)
- callback_preference_note (free text, used in greeting + call rules)
- additional_instructions (appended to every Vapi prompt)

On every save: calls /api/vapi-sync with tenantId to push live config to Vapi.

---

## TAB DETAIL — DASHBOARD

4 stat cards: Calls today, New leads (7 days), Referrals sent (7 days), Minutes used this month.
Recommendation card — 4 priority states: actionable leads → minutes running low → no calls yet → healthy.
Recent calls feed — last 8, caller name/number, time, duration, AI summary, outcome badge.
Two-column: Leads requiring action + Referrals sent today.

---

## TAB DETAIL — ANALYTICS

3 headline numbers: Total calls, Lead capture rate %, Avg call duration.
Recommendation card — context-aware per tier and data state.
4 tier-gated feature cards (Enterprise unlocks all):
- Pricing Intelligence (blurred preview on Light/Standard)
- Call Outcome Breakdown (live bar chart for Enterprise)
- Caller Patterns (live day-of-week bar chart for Enterprise)
- Competitor Intelligence (blurred preview on Light/Standard)

---

## TAB DETAIL — PARTNERS & REFERRALS

STRATEGIC DECISION — LOCKED: Partner network is unlimited at ALL tiers. No cap, no gate. Tenants who build large partner networks are harder to churn and create more reciprocal obligation.

Sections:
- Partner Network — unlimited all tiers. Name + phone + specialty per partner. → referral_partners + referral_service_map
- Referral Code — Syne display, copy button, QR via api.qrserver.com, referral link
- Credits — balance in months. 1 referral = 1 free month, stackable, no expiry → tenant_credits
- Network Activity — outbound count + £ estimated value (£75/referral), retention anchor card

---

## TAB DETAIL — ACCOUNT

- Plan & Billing — tier badge, upgrade cards (Stripe not wired — placeholder buttons)
- Account Details — business name (editable), email (read-only), save + password reset
- Notifications — 3 toggles: new lead, daily summary, weekly report → tenants columns
- Feedback — time-gated at 42 days from tenant creation → tenant_feedback
- Support chat — chat UI, opening message, placeholder responses (Claude API endpoint pending)
- Cancel flow — two-stage retention modal showing personalised loss (lead count, partner count, referral count)

---

## VERA HELP MASCOT — FULL SYSTEM

### HelpMascot.jsx

Props: { contextKey, tenantId, activeTab, businessName }

Three modes:

**Hover mode** — click Vera (violet owl, 44×72px) to toggle. When on: hover any [data-help] element → FloatingBubble appears beside it with the data-help text.

**Need more help mode** — "Need more help?" button. On click: scans all [data-help] elements, draws amber glowing overlay on each. Clicking a zone opens a VeraDialogue panel. Multiple panels can be open simultaneously.

**Proactive speech** — on tab load, checks vera_speeches for speech matching contextKey. If found and tenant hasn't seen it (vera_seen), shows speech bubble for 9 seconds then marks seen. Each speech shown once per tenant lifetime.

CSS injected via injectStyles() into document.head. Animations: veraBob, veraFlyIn, veraFlyOut, veraTyping, veraGlow.

### VeraDialogue.jsx

340×420px draggable panel. Positioned near clicked zone, clamped to viewport. Violet drag-handle header shows tab name + zone title. Context chip shows first 120 chars of zone text. Chat thread with user/Vera bubbles. Calls /api/vera-chat (Claude Haiku). Typing indicator. Enter to send.

### data-help coverage — COMPLETE

All 6 tabs now have data-help attributes on every section heading and key UI element. This is what Vera's glowing zones mode uses. Convention: add data-help="..." to any new section headings or key UI elements.

---

## VISUAL LANGUAGE — LOCKED

All inline styles — no CSS files. No CSS variables.

| Token | Value | Usage |
|-------|-------|-------|
| Violet primary | #5e3b87 | Header, borders, active states |
| Violet dark | #4a2d6e | Nav strip |
| Violet deep | #3a2057 | Gradient ends |
| Amber | #f0a500 | Active tab, CTAs, stat numbers |
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
Logo: "Verrante" Syne 700 + 7px amber dot (marginLeft 3, marginBottom 8).

---

## ONBOARDING FLOW

Onboarding.jsx — 6 steps: Business type → About your business → Your services → Your boundaries → Your partners → Review & launch.

On submit: creates tenant row, inserts services, inserts referral_partners, creates tenant_memberships.

Guards (both directions): Portal → /onboarding if no membership. Onboarding → /portal if membership exists.

---

## CODE CONVENTIONS

- All .single() replaced with .maybeSingle() — prevents 406 errors on 0 rows
- All Supabase queries wrapped in try/catch with finally { setLoading(false) }
- Tab components receive onNavigate prop for cross-tab navigation
- Tier checks: isEnterprise = tier === 'enterprise' || tier === 'bespoke'
- Client limit: CLIENT_LIMIT = { light: 20, standard: 50, enterprise: 200, bespoke: 200 }
- No CSS files — all inline styles
- data-help on all section headings and key UI elements (Vera reads these)
- Supabase anon key safe in frontend. Service role key NEVER in frontend — server only.

---

## CURRENT BUILD STATE — WHAT IS DONE

- [x] All 6 portal tabs — fully built and wired to Supabase
- [x] Auth guards — Portal ↔ Onboarding bidirectional
- [x] Visual language — Login, Signup, Onboarding, Portal all on violet palette
- [x] Deployed to Vercel — auto-deploys on git push to master
- [x] Notification preferences — persisted to tenants table
- [x] Vapi webhook handler — api/vapi-webhook.js, confirmed working end-to-end
- [x] vapi_assistant_id column on tenants — webhook looks up tenant per call
- [x] Vapi assistant sync — api/vapi-sync.js, called after every AI Behaviour save
- [x] System prompt builder — api/_build-prompt.js, full call type rules, tone, outcome type, sensitive override
- [x] Vera mascot — violet owl SVG, hover explains, proactive speeches, need-more-help glowing zones, draggable dialogue panels (Claude Haiku)
- [x] Vera data-help coverage — complete across all 6 tabs
- [x] AI Behaviour additions — tone register, business outcome type, callback preference note, additional instructions
- [x] Test call end-to-end — confirmed working, call log saved to DB

---

## IMMEDIATE BUILD PRIORITIES (ordered)

1. **RLS fix** — verify HS256 legacy key + auth.uid() works, test policies, re-enable before go-live
2. **Stripe** — billing, upgrade flow, webhook for plan changes
3. **Support chat** — Claude API endpoint + tenant context injection (AccountSettings.jsx placeholder ready)
4. **Vera speeches data** — populate vera_speeches table with proactive content for each tab context_key (6 keys: dashboard.first_visit, profile.first_visit, ai_behaviour.first_visit, analytics.first_visit, referrals.first_visit, account.first_visit)
5. **Make.com scenario wiring** — connect webhook events to downstream actions
6. **End-to-end journey test** — 10 scenarios across all call types
7. **Notification dispatch** — backend for the 3 notification toggles (columns exist, emails not wired)

---

## PARKED FEATURES — CONFIRMED SPEC, NOT YET BUILT

**Call sample recordings:** 15 pre-recorded MP3s (5 call types × 3 modes). Hover mode selector in AI Behaviour → "Listen to a Strict call · 80 seconds". Generate with ElevenLabs. Generic samples for V1.

**Public Playground:** Standalone, no auth. Language selector (8 languages) × dialect slider (5 positions) → voice sample. 40 pre-rendered MP3s. CTA always visible. After 10 seconds: retention copy.

**Referred signup surface:** ?ref=TENANTCODE page. Warm traffic, captures referred_by_tenant_id.

---

## FUTURE TASKS — PARKED

- get_vapi_context PostgreSQL function (SQL written, not deployed)
- VIP caller context injection — client directory UI built, Vapi routing logic pending
- Staff specialist routing — UI built, Vapi routing logic pending
- Twilio SMS integration
- Weekly/monthly email reports
- Number blocking — table exists, UI placeholder built, logic pending
- CSV import for existing client data
- GDPR compliance review before first paying tenant
- n8n migration at 30 tenants
- Pricing intelligence coaching feature
- Multi-site and franchise architecture (post revenue)
- Domain confirmation (verrante.com placeholder)
- Terms of service document

---

## PRACTICAL NOTES

- Dev server: two separate commands — `cd C:\Users\philo\verrante-portal` then `npm run dev`
- PowerShell does not support && — always two separate commands or use Bash tool
- F12 hijacked by ASUS — use Ctrl+Shift+I or right-click Inspect
- Vercel auto-deploys on git push to master
- Hot reload active — file saves go straight to browser
- SQL Editor in Supabase: run, confirm success, close tab
