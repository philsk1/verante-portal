# VERRANTE — PROJECT HANDOFF DOCUMENT
Paste this in full at the start of every new conversation thread.
Last updated: 2026-06-03

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

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator — reads decisions, doesn't just execute. Tech hires deliberately deferred. Uses Claude Code (VSCode extension) for all development.

Risk window is 50–500 tenants. Three protections: AI handles support, agencies over employees in this window, any human hire works the human layer not the technical one.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools. PowerShell does not support &&  — always run as two separate commands. Bash tool preferred when available.

---

## TIER STRUCTURE — LOCKED

| Tier | Price | Concurrent calls | Minutes/mo |
|------|-------|-----------------|------------|
| Light | £29/month | 1 | 60 |
| Standard | £49/month | 1 | 150 |
| Enterprise | £99/month | 3+ | 400 |
| Bespoke | Contact us | Custom | Custom |

Overage: £0.18/min

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

---

## SUPABASE — CONFIRMED DETAILS

- Project URL: https://kkrsvkxkefijmtbwykzv.supabase.co
- Anon key (legacy HS256 — use this, NOT the sb_publishable_ format):
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ
- Service role key: in Vercel environment variables only. NEVER in frontend code.

### RLS STATUS — NEEDS VERIFICATION
There is a conflict between documents. CLAUDE.md says RLS is enabled; V9 handoff said it was disabled due to ES256/HS256 JWT issue (new sb_publishable_ key format caused auth.uid() to return null). The legacy HS256 anon key is confirmed working. RLS must be verified and confirmed enabled before go-live. Not a blocker for development.

RLS policy pattern used throughout:
```sql
using (tenant_id in (select tenant_id from tenant_memberships where user_id = auth.uid()))
```
Helper function `is_tenant_member(tid)` used by all policies. Migration script: `supabase_rls.sql` in project root.

---

## DATABASE — ALL TABLES DEPLOYED

business_type_categories, business_type_subcategories, templates, template_services, template_banned_services, tenants, tenant_credits, tenant_feedback, profiles, tenant_memberships, callers, caller_tenant_relationships, services, banned_services, referral_partners, referral_service_map, referral_log, leads, quotes, quote_outcomes, competitor_intelligence, pricing_intelligence, follow_up_messages, follow_up_responses, call_logs, minute_usage, usage_alerts, triage_outcomes, staff_profiles, call_handling_rules

### Key columns added in recent sessions

**tenants:** `vapi_assistant_id` (text) — used by webhook to look up which tenant a call belongs to. Also: `notify_new_lead`, `notify_daily_summary`, `notify_weekly_report` (boolean) — notification preferences, now persisted.

**staff_profiles:** id, tenant_id, name, role, specialist_services, phone, active (bool), created_at

**call_handling_rules:** id, tenant_id, call_type, mode, booking_link (bool), callback (bool), email (bool), email_address, instructions, created_at. UNIQUE(tenant_id, call_type). call_type values: new_customer, partner_service, sales_call, supplier_delivery, invoice_authorities

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
- `public/test-call.html` — test page with hardcoded test Vapi credentials (NOT production)

---

## PORTAL STRUCTURE — ALL 6 TABS BUILT

Shell: 64px violet header (#5e3b87, logo left, email+signout right) → 44px dark violet nav strip (#4a2d6e, amber underline on active) → #f7f6f9 content area, maxWidth 940px, padding 2rem. Default tab: Dashboard.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | BusinessProfile.jsx | BUILT |
| AI Behaviour | AIBehaviour.jsx | BUILT |
| Dashboard | ActivityDashboard.jsx | BUILT |
| Analytics | DataAnalytics.jsx | BUILT |
| Partners & Referrals | PartnersReferrals.jsx | BUILT |
| Account | AccountSettings.jsx | BUILT |

Auth flow: Login → Signup → Onboarding (creates tenant + membership) → Portal. Bidirectional guards in place.

---

## TAB DETAIL — BUSINESS PROFILE

1. **Business Details** — name, phone, email, booking link, address, opening hours, business context → tenants
2. **Your Services** — chip list of services AI accepts → services table
3. **Partner Services** — chip list of services AI warm-refers out → banned_services table (rename pending)
4. **Client Directory** — known clients, specialist instructions injected into AI context on their call → callers + caller_tenant_relationships. Quotas: Light 20 / Standard 50 / Enterprise 200. Quota bar with amber warning at limit.
5. **Employee Profiles** — Enterprise only. Name, role, specialist_services, direct line, active toggle → staff_profiles. AI uses for routing.

---

## TAB DETAIL — AI BEHAVIOUR

1. **Call Handling** — global triage mode (Strict/Balanced/Open) + escalation preference → tenants
2. **Call Type Rules** — 5 call type cards (new_customer, partner_service, sales_call, supplier_delivery, invoice_authorities). Each has: mode override, 4 closing method toggles, email field with "Use mine" button, instructions textarea → call_handling_rules via upsert
3. **Emergency Keywords** — chip list, triggers immediate escalation → tenants.emergency_keywords (text[])
4. **Greeting Message** — custom first words or system default → tenants.greeting_message
5. **Call Filtering** — spam detection, sales call handling, autodialler detection → tenants columns
6. **Number Blocking** — Light: locked. Standard+: coming soon placeholder.

Bottom: violet gradient card linking to Partners tab.

---

## TAB DETAIL — DASHBOARD (ActivityDashboard.jsx)

- 4 stat cards: Calls today, New leads (7 days), Referrals sent (7 days), Minutes used this month
- Recommendation card — 4 priority states: actionable leads → minutes running low → no calls yet → healthy default
- Recent calls feed — last 8, with caller name/number, time, duration, caller_notes quoted, outcome badge
- Two-column: Leads requiring action + Referrals sent today

---

## TAB DETAIL — ANALYTICS (DataAnalytics.jsx)

- 3 headline numbers: Total calls, Lead capture rate %, Average call duration
- 4 tier-gated feature cards (Enterprise unlocks all): Pricing Intelligence, Call Outcome Breakdown, Caller Patterns, Competitor Intelligence

---

## TAB DETAIL — PARTNERS & REFERRALS (PartnersReferrals.jsx)

LOCKED DECISION: Partner network unlimited at ALL tiers — flywheel depends on frictionless partner addition.

- Partner Network — name, phone, specialty per partner → referral_service_map. Network strength label.
- Referral Code — Syne display, copy, QR via api.qrserver.com
- Credits — balance in months, earn mechanic (1 referral = 1 free month, stackable, no expiry)
- Network Activity — outbound count + £ estimated value (£75/referral)

---

## TAB DETAIL — ACCOUNT (AccountSettings.jsx)

- Plan & Billing — tier badge, upgrade cards. Stripe NOT yet wired — buttons are placeholders.
- Account Details — business name editable, email read-only
- Notifications — new lead / daily summary / weekly report toggles. NOW PERSISTED to tenants table.
- Feedback — time-gated at 42 days from creation → tenant_feedback table
- Support chat — UI built, Claude API endpoint pending
- Cancel flow — two-stage retention modal showing personalised loss (leads, partners, referrals)

---

## VAPI WEBHOOK — BUILT AND CONFIRMED WORKING

File: `api/vapi-webhook.js` (Vercel serverless function)

What it does on `end-of-call-report`:
1. Looks up tenant by `tenants.vapi_assistant_id`
2. Finds or creates caller record in `callers` by phone number
3. Writes `call_logs` row (duration, transcript, caller_notes/summary, triage_outcome)
4. If outcome is `lead_captured` or `booked` → writes `leads` row
5. If outcome is `referred_out` → looks up partner by name and writes `referral_log` row

Structured data the webhook expects from Vapi analysis:
- `analysis.structuredData.triage_outcome` — one of: lead_captured, booked, referred_out, filtered, escalated, hard_close, spam
- `analysis.structuredData.caller_name`
- `analysis.structuredData.referred_to` (partner business name, for referral matching)
- `analysis.summary` — written to caller_notes

Test call page: `public/test-call.html` — hardcoded test credentials, for testing only.
End-to-end test: CONFIRMED. Test call made, call log saved to DB, visible in Dashboard.

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
- Tier checks: `isEnterprise = tier === 'enterprise' || tier === 'bespoke'`
- Client limit: `CLIENT_LIMIT = { light: 20, standard: 50, enterprise: 200, bespoke: 200 }`
- `data-help` attributes on all section headings and key UI elements (for Vera mascot)
- Vera: `src/components/HelpMascot.jsx` — violet owl, click to wake, floats to data-help elements

---

## CURRENT BUILD STATE

### Done
- [x] All 6 portal tabs — fully built and wired
- [x] Auth guards — Portal ↔ Onboarding bidirectional
- [x] Vera mascot — owl, click to wake, floats to data-help elements
- [x] Visual language — Login, Signup, Onboarding, Portal all on violet palette
- [x] Deployed to Vercel — auto-deploys on git push
- [x] Notification preferences — persisted to tenants table
- [x] Vapi webhook handler — `api/vapi-webhook.js`, deployed on Vercel
- [x] `vapi_assistant_id` column on tenants — webhook can look up tenant per call
- [x] Test call end-to-end — call made, log saved, visible in Dashboard

### Next (in priority order)
- [ ] Vapi assistant system prompt — business context injection, structured data extraction, 5 call type behaviours (core product)
- [ ] RLS verification — confirm enabled/disabled, fix before go-live
- [ ] Stripe — billing, upgrade flow, webhook for plan changes
- [ ] Support chat — Claude API endpoint + tenant context injection
- [ ] get_vapi_context PostgreSQL function — context injection for VIP caller handling
- [ ] Make.com scenario wiring

---

## PARKED FEATURES — SPECCED, NOT YET BUILT

- **Call sample recordings:** 15 pre-recorded MP3s (5 call types × 3 modes). Hover on mode selector → play sample. Same pipeline as Public Playground. ElevenLabs. Generic V1, personalised Enterprise later.
- **Public Playground:** Standalone, no auth. Language selector (8) → dialect slider (5) → voice sample → CTA. 40 pre-rendered MP3s.
- **Referred signup surface:** `/signup?ref=TENANTCODE`. Captures referred_by_tenant_id.

---

## FUTURE TASKS — PARKED

- Twilio SMS integration
- Weekly/monthly email reports
- Number blocking table + UI completion
- CSV import for existing client data
- GDPR compliance review before first paying tenant
- Domain confirmation (verrante.com)
- Terms of service
- Bespoke tier enquiry route
- Multi-site and franchise architecture (post revenue)
- Pricing intelligence coaching feature
- n8n migration at 30 tenants
- Competitor intelligence and pricing intelligence — tables exist, AI writing pending
- i18n scaffolding before international expansion
