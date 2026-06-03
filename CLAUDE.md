# Verrante Portal — Project Brief

This file is auto-loaded by Claude Code at the start of every session.
It is the single source of truth for project context, strategy, and state.
Update it at the end of every working session.

---

## What Verrante Is

AI call handling and lead capture SaaS for solo operators and micro-service businesses in the UK — hair salons, tradespeople, sole traders. The AI answers calls, qualifies enquiries, captures leads, makes warm referrals, and filters spam. The owner sees everything in a portal.

Working name — not legally confirmed yet.

**Pricing:** Light £29/mo · Standard £49/mo · Enterprise £99/mo · Bespoke on request

**Scale intent:** Build to 500 tenants before making tech hires. Using AI (Claude) for all development in current window.

---

## Founder

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator — reads decisions, doesn't just execute. Tech hires deliberately deferred. Uses Claude Code (VSCode extension) for all development.

Dev environment: Windows 11, VSCode, PowerShell. F12 key hijacked by ASUS — uses Ctrl+Shift+I for devtools.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Telephony | Vapi |
| STT | Deepgram |
| LLM | Gemini 1.5 Flash or GPT-4o mini |
| TTS | Cartesia / Deepgram |
| Database | Supabase (PostgreSQL) |
| Automation | Make.com → n8n at 30 tenants |
| Frontend | React + Vite |
| Hosting | Vercel (auto-deploys on git push) |
| SMS | Twilio |
| Payments | Stripe (not yet wired) |

**Supabase project:** https://kkrsvkxkefijmtbwykzv.supabase.co
**GitHub:** https://github.com/philsk1/verante-portal
**Live URL:** https://verante-portal.vercel.app

---

## Visual Language — LOCKED

Do not deviate from this palette. Check here before adding any UI.

**Colours:**
- Violet primary: `#5e3b87`
- Violet dark: `#4a2d6e`
- Violet deep: `#3a2057`
- Amber: `#f0a500` (buttons, accents)
- Amber text on buttons: `#1a0533`
- Amber light: `#fef3d9`
- Page bg: `#f7f6f9`
- Card bg: `#ffffff`
- Card border: `0.5px solid rgba(94,59,135,0.1)`
- Success: `#3db87a`
- Text: `#1a1a1a` · Secondary: `#666` · Tertiary: `#aaa`

**Fonts:** Syne 700 for headings/display/numbers. DM Sans 300/400/500 for body/UI. Both imported via Google Fonts in index.html.

**Logo:** "Verrante" Syne 700 + 7px amber dot (marginLeft 3, marginBottom 8).

**Primary button:** `#f0a500` bg, `#1a0533` text, borderRadius 8px.
**Disabled button:** `#f5d98a` bg, `#7a5c1a` text.
**Secondary button:** white bg, violet border, violet text.

**Cards:** white bg, borderRadius 10px, border `0.5px solid rgba(94,59,135,0.1)`, padding 1.75rem.
**Locked sections:** `blur(3px)` + `opacity 0.45`, absolute white badge with upgrade copy.

**All inline styles** — no CSS variables in use yet.

---

## Portal Structure

Portal shell: 64px violet header (logo left, email + sign out right) → 44px dark violet nav strip (amber underline on active) → `#f7f6f9` content area, maxWidth 940px centered, padding 2rem.

**Tabs (all built):**
1. Business Profile — `BusinessProfile.jsx`
2. AI Behaviour — `AIBehaviour.jsx`
3. Dashboard — `ActivityDashboard.jsx` (default tab)
4. Analytics — `DataAnalytics.jsx`
5. Partners & Referrals — `PartnersReferrals.jsx`
6. Account — `AccountSettings.jsx`

Each tab is a standalone component imported in `Portal.jsx`. All connect to `tenants` via `tenant_memberships`.

**Vera help mascot:** `src/components/HelpMascot.jsx` — violet owl SVG, bobs at top of every page. Click to wake, floats next to any `data-help` element to explain it. Business name fetched in Portal.jsx, passed as prop, shown on every tab in Syne 700 grey.

**Auth flow:** Login → Signup → Onboarding (creates tenant + membership) → Portal. Portal redirects to Onboarding if no membership. Onboarding redirects to Portal if membership already exists.

---

## Database — Key Tables

- `tenants` — one row per business
- `tenant_memberships` — links users to tenants (user_id → auth.users)
- `services` / `banned_services` — per tenant
- `call_logs` / `leads` — per tenant, written by Vapi worker
- `callers` — global phone book, linked via `caller_tenant_relationships`
- `call_handling_rules` — per tenant, upserted on (tenant_id, call_type)
- `referral_partners` / `referral_service_map` / `referral_log` — per tenant
- `staff_profiles` — Enterprise only
- `tenant_feedback` — per tenant
- `business_type_categories` / `business_type_subcategories` / `template_services` — public reference tables

**RLS:** Fully enabled on all tables. Helper function `is_tenant_member(tid)` used by all policies. Migration script: `supabase_rls.sql` in project root.

---

## Current Build State (last updated: 2026-06-03)

### Done
- [x] All 6 portal tabs — fully built and wired
- [x] Auth guards — Portal ↔ Onboarding bidirectional
- [x] Vera mascot — owl, click to wake, floats to data-help elements
- [x] Visual language — Login, Signup, Onboarding, Portal all on violet palette
- [x] Deployed to Vercel — auto-deploys on git push
- [x] Notification preferences — persisted to tenants table
- [x] Vapi webhook handler — `api/vapi-webhook.js`, deployed on Vercel, uses service_role key via env var
- [x] `vapi_assistant_id` column on tenants — webhook looks up tenant per call
- [x] Test call end-to-end — confirmed working, call log saved to DB

### Next (priority order)
- [ ] Vapi assistant system prompt — business context injection, structured data extraction, 5 call type behaviours
- [ ] RLS — verify current status (conflict between docs), fix before go-live
- [ ] Stripe — billing, upgrade flow, webhook for plan changes
- [ ] Support chat — Claude API endpoint + tenant context injection

---

## Working Conventions

- **Commit often.** End of every session: commit, push.
- **Visual language is locked.** Always check this file before adding UI.
- **No CSS files** — all inline styles.
- **No i18n scaffolding yet** — flagged as required before international expansion.
- **Supabase anon key** is safe to be public (it's in supabase.js, not .env). That's correct.
- **Service role key** must NEVER go in frontend code — only in server-side Vapi worker.
- **Vera's data-help attributes** — add to any new section headings and key UI elements so Vera can explain them.
- **End of session ritual:** Update the "Current Build State" section above, commit, push.
