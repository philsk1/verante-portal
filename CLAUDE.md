# QERXEL — SINGLE SOURCE OF TRUTH
## This file is auto-loaded by Claude Code at the start of every session.
## READ THIS FILE IN FULL BEFORE DOING ANYTHING ELSE.
## UPDATE THIS FILE BEFORE ENDING ANY SESSION.

---

## HOW TO USE THIS DOCUMENT

This is the single authoritative reference for the Qerxel project. It contains truth derived from actual code analysis, not aspirational descriptions. When this document and the code disagree, investigate — one of them is wrong.

**Session start:** Read this file completely. Do not begin work until you have done so.

**During session:** When you discover something that contradicts or updates this document, note it. Don't act on stale information.

**Session end (mandatory):** 
- Mark completed tasks as ✅ Done with the date
- Add any new issues discovered to the Known Issues section
- Remove resolved issues from Known Issues
- Update "Next Tasks" to reflect current state
- Update "Last updated" date at the bottom
- No exceptions. Drift is how projects fail.

**Truth hierarchy:** This file > code reality > QERXEL-HANDOFF-V12.md (archived, do not consult)

---

## 1. PROJECT IDENTITY

**What it is:** AI call-handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

**Core promise (locked):** "Never miss another lead."

**Working name:** Qerxel. Not legally confirmed.

**Scale intent:** 500 tenants before any tech hire. All development via Claude Code.

**Founder:** Philip Keating. 27 years running a manufacturing business (print), peaked at 55 staff. Strategic operator, not a developer. Uses Claude Code VSCode extension exclusively.

**Dev environment:** Windows 11, VSCode, PowerShell. F12 hijacked by ASUS — uses Ctrl+Shift+I for devtools.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Telephony | Vapi (BYOK pricing) |
| STT | Deepgram Nova-2 (non-negotiable) |
| LLM Standard | Gemini Flash |
| LLM Premium | GPT-4o mini |
| TTS Standard | Cartesia Sonic 3 |
| TTS Premium | Cartesia Sonic 3.5 |
| Database | Supabase (PostgreSQL) — project kkrsvkxkefijmtbwykzv |
| Frontend | React + Vite → Vercel |
| Auth | Supabase Auth |
| Email | Resend (transactional) |
| SMS | Twilio |
| Payments | Stripe (wired, needs dashboard setup) |
| Automation | Make.com → n8n at 30 tenants |
| Website scrape | Firecrawl (onboarding) |
| Calendar UI | react-big-calendar + date-fns |
| Vera AI | Claude Haiku (vera-chat, support-chat, greeting-generator, scrape-website) |

**Supabase:**
- URL: https://kkrsvkxkefijmtbwykzv.supabase.co
- Anon key (HS256 — ALWAYS use this, NEVER use sb_publishable_): in `src/supabase.js`
- Service role key: in Vercel env vars only, never in frontend
- RLS: ENABLED on all tables. Owner bypass: `supabase_owner_rls.sql` (already run)
- SQL access: `POST https://api.supabase.com/v1/projects/kkrsvkxkefijmtbwykzv/database/query` with `Authorization: Bearer <SUPABASE_PAT>`. PAT is in `.env` as `SUPABASE_PAT`.

**GitHub:** https://github.com/philsk1/verante-portal
**Live URL:** https://verante-portal.vercel.app
**Deploy command:** `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod` (TLS fix for Node 24 on Windows)
**Vercel GitHub auto-deploy:** broken — always deploy manually.

---

## 3. LOCKED VISUAL RULES — NEVER VIOLATE

All styles are inline. No CSS files. No CSS variables. Ever. No exceptions.

| Token | Value |
|-------|-------|
| Violet primary | `#5e3b87` |
| Violet dark | `#4a2d6e` |
| Violet deep | `#3a2057` |
| Amber | `#f0a500` |
| Amber text (on buttons) | `#1a0533` |
| Page bg | `#f7f6f9` |
| Card bg | `#ffffff` / border `0.5px solid rgba(94,59,135,0.1)` |
| Success green | `#3db87a` |
| Text primary | `#1a1a1a` |
| Text secondary | `#666` |
| Text muted | `#aaa` |

Fonts: **Syne 700** (headings, logo, numbers) · **DM Sans 300/400/500** (body). Google Fonts in index.html.

Primary button: `#f0a500` bg · `#1a0533` text · `borderRadius 8px`
Disabled button: `#f5d98a` bg · `#7a5c1a` text
Secondary button: white bg · violet border
Locked sections: `blur(3px)` + `opacity 0.45` + absolute white badge

---

## 4. LOCKED CODE RULES — NEVER VIOLATE

- **PowerShell does not support `&&`** — always two separate Bash calls
- **Anon key in frontend only.** Service role key in API endpoints only. Never cross this.
- **HS256 anon key only.** Never use the ES256 `sb_publishable_` key.
- **`.maybeSingle()` not `.single()`** — prevents 406 errors on 0 rows
- **Save guard on every mutation:** `if (isPreview || !tenantId) return`
- **No comments** unless the WHY is non-obvious
- **No CSS files, no CSS variables** — already stated but worth repeating
- **Tier check pattern (canonical — always use this):**
  ```js
  const isProfessional = tier === 'professional'
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
  const isProfessionalOrAbove = isProfessional || isEnterprise
  ```
- **Vera speeches:** column is `context_key` (not `speech_key`)
- **API limit:** 12/12 Vercel Hobby — AT CAPACITY. No new API files without consolidating first.
- **Deploy:** `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod`
- **SQL via management API:** use Node.js with `NODE_OPTIONS=--use-system-ca` — curl fails on Windows/Node 24

---

## 5. PRODUCT ARCHITECTURE — LOCKED

Three products. Two standalones. One augmentation layer.

### Answer (standalone)
AI answers missed calls, triages intent, captures leads, routes to booking or callback.
Core product. Most competitive space.

### Schedule (standalone — market entry)
Calendar and appointment scheduling. Basic tier (entry) is **always free** with any purchase — this is the Trojan horse strategy. Schedule is deliberately feature-rich to hook buyers into the brand and upsell to Answer.
- `calendar_tier = 'entry'` — basic single-staff calendar
- `calendar_tier = 'multi'` — multi-staff team calendar (paid add-on)
- `calendar_tier = 'none'` — no Schedule product

### Listen (augmentation layer)
Real-time AI screen copilot activated when owner picks up a call themselves. Surfaces context on screen: creates bookings as they speak, shows customer history, suggests catalogue items.
- Requires Answer OR paid Schedule to function (needs telephony infrastructure)
- Cannot stand alone
- `listen_tier = 'none'` — not purchased
- `listen_tier = 'standard'` — active

### Product combinations and nav structure

**Answer only:**
```
ANSWER → Dashboard · AI Settings · Analytics · Partners
PLATFORM → Integrations · Business Profile · Account & Billing
```

**Answer + Listen:**
```
ANSWER → Dashboard · AI Settings · Analytics · Partners
LISTEN → Listen
PLATFORM → Integrations · Business Profile · Account & Billing
```

**Answer + Schedule:**
```
ANSWER → Dashboard · AI Settings · Analytics · Partners
SCHEDULE → Calendar · Team
PLATFORM → Integrations · Business Profile · Account & Billing
```

**Answer + Listen + Schedule:**
```
ANSWER → Dashboard · AI Settings · Analytics · Partners
LISTEN → Listen
SCHEDULE → Calendar · Team
PLATFORM → Integrations · Business Profile · Account & Billing
```

**Schedule only (dazzle nav — NOT YET BUILT):**
```
SCHEDULE → Calendar · Team · Services · Analytics · Partners
PLATFORM → Integrations · Business Profile · Account & Billing (Answer shown as upsell)
```

---

## 6. TIER STRUCTURE

| Tier value | Price | Minutes/mo | Concurrent |
|-----------|-------|-----------|-----------|
| `free` | £0 (PAYG 35p/min) | 0 | 1 |
| `light` | £29/mo | 120 | 1 |
| `standard` | £49/mo | 250 | 1 |
| `professional` | £69/mo | 450 | 2 |
| `enterprise` | £249/mo | 1,000 | 3+ |
| `bespoke` | Contact us | Custom | Custom |

Overage: Premium voice £0.18/min · Standard voice £0.14/min · PAYG flat £0.35/min

---

## 7. DATABASE — TABLE MAP

| Table | Purpose | Key writers | Key readers |
|-------|---------|-------------|-------------|
| `tenants` | Core config, tiers, AI settings | Onboarding, AccountSettings, all tabs | Every file |
| `tenant_memberships` | auth.users → tenants link | Onboarding | Portal, all tabs (load tenantId) |
| `staff_profiles` | Team members | StaffDirectory | Calendar, Portal, _build-prompt |
| `staff_availability` | Working hours per staff/day | Calendar (StaffScheduleTab) | Calendar, BookingPage |
| `appointments` | Booked slots | Calendar | Calendar, BookingPage |
| `catalogue_items` | Services/products — AI reads this | BusinessProfile (catalogue section) | Calendar, CalendarIntelligence, _build-prompt |
| `services` | ⚠️ LEGACY service list | BusinessProfile (services section), Onboarding | BusinessProfile only — AI does NOT read this |
| `banned_services` | Topics AI won't handle | BusinessProfile | PartnersReferrals, _build-prompt |
| `referral_partners` | Partner businesses | PartnersReferrals | _build-prompt, vapi-webhook |
| `referral_service_map` | Intent → partner mapping | PartnersReferrals | _build-prompt |
| `referral_log` | Referral events | vapi-webhook | PartnersReferrals |
| `leads` | Captured leads | vapi-webhook, ActivityDashboard | ActivityDashboard |
| `callers` | Caller phone records | vapi-webhook | ActivityDashboard |
| `call_logs` | Every call | vapi-webhook | ActivityDashboard, DataAnalytics, ListenTab |
| `tenant_catalogue` | Enterprise scraped content | (Firecrawl pipeline) | CalendarIntelligence |
| `vera_seen` | Vera speeches seen | HelpMascot | HelpMascot |
| `vera_speeches` | Vera speech content | (SQL seed) | HelpMascot |

**`tenants` new column (2026-06-13):** `q_dismissals jsonb DEFAULT '{}'::jsonb` — stores per-page dismissal timestamps. Example: `{"ai": "2026-06-13T10:00:00Z", "dashboard": "2026-05-01T..."}`. Written by HelpMascot via QScoreContext `saveDismissal(pageKey)`. Read by QScoreContext on load.
| `tenant_feedback` | Product feedback | AccountSettings | — |

**NOTE: `callers` table uses `full_name` column, NOT `name`. Verified from schema 2026-06-11.**

**GDPR columns on `caller_tenant_relationships`:** `marketing_opted_out bool DEFAULT false`, `opted_out_at timestamptz`, `is_hot_prospect bool DEFAULT false`, `deletion_requested bool DEFAULT false`, `deletion_requested_at timestamptz`

**`catalogue_items`** has `internal_notes text` column (AI-invisible; owner notes only).

**`campaigns` table:** tracks SMS campaign sends. Columns: `id, tenant_id, name, message, recipient_count, sent_count, failed_count, status, search_context, created_at, sent_at`. RLS enabled.

**`tenants` new columns:** `keep_alive_topics text[] DEFAULT ARRAY['appointment booking','product enquiry','senior citizen']`, `keep_alive_max_minutes integer DEFAULT 5`

---

## 8. FILE MAP

### Core
| File | Role |
|------|------|
| `src/main.jsx` | Vite entry |
| `src/App.jsx` | Router (AuthProvider + PreviewProvider wrap all routes) |
| `src/supabase.js` | Supabase client — anon key |

### Routes
| Path | Component | Auth |
|------|-----------|------|
| `/login` | Login.jsx | public |
| `/signup` | Signup.jsx | public |
| `/onboarding` | Onboarding.jsx | protected |
| `/portal` | Portal.jsx | protected |
| `/owner/select` | OwnerSelector.jsx | protected (owner only) |
| `/owner/audit` | OwnerAudit.jsx | protected (owner only) |
| `/plans` | PlanSelector.jsx | protected |
| `/book/:tenantId` | BookingPage.jsx | public |

### Contexts
| File | Provides |
|------|---------|
| `src/context/AuthContext.jsx` | user, session, signOut |
| `src/context/PreviewContext.jsx` | isPreview, previewTenantId, previewBusinessName, enterPreview, exitPreview, tierOverride |
| `src/context/QScoreContext.jsx` | globalScore, globalMood, globalCaption, qMode, configPillar, toolPillar, perfPillar, coachingPoints, qDismissals, saveDismissal(pageKey), refresh() — loaded once per portal session |

### Portal shell
`src/pages/Portal.jsx` — main shell. Owns sidebar nav, tab routing, preview banner, mobile nav. All tenant state delegated to `useTenantState()` hook. Icons imported from `PortalIcons.jsx`.
`src/pages/PortalIcons.jsx` — 20 named SVG icon components (IcoDashboard, IcoAI, … IcoEye).
`src/hooks/useTenantState.js` — custom hook: 17 tenant state vars + init effect (parallel Promise.all fetches) + preview-reload effect + `saveReturnDate`/`saveNotification` helpers.

### Tab files
| File | Tab ID | Product | Notes |
|------|--------|---------|-------|
| `ActivityDashboard.jsx` | dashboard | Answer | Zone 1/2/3, reads listen+calendar tier locally |
| `AIBehaviour.jsx` | ai | Answer | Vapi config, prompt builder, tone/triage settings |
| `DataAnalytics.jsx` | analytics | Answer | Charts, enterprise-gated competitive intel |
| `PartnersReferrals.jsx` | referrals | Answer | Partner management, referral network |
| `ListenTab.jsx` | listen | Listen | Transcript archive, copilot mode stub |
| `Calendar.jsx` | calendar | Schedule | Full calendar — ⚠️ effectiveCalendarTier hardcoded 'multi' |
| `CalendarIntelligence.jsx` | (sub-component of Calendar) | Schedule | Intelligence Hub sub-panel |
| `StaffDirectory.jsx` | team | Schedule | Staff cards, slide-in panel, tag picker |
| `BusinessProfile.jsx` | profile | Platform | Business config + 4 navigation tiles (Clients/Services/Products/Team) |
| `ClientDirectory.jsx` | clients | Business | Searchable client list, hot prospects, opt-out, campaign composer |
| `ServiceCatalogue.jsx` | services | Business | Searchable services, notes, tier-gated quota |
| `ProductCatalogue.jsx` | products | Business | Searchable products with SKU, notes, tier-gated quota |
| `Integrations.jsx` | integrations | Platform | Integration modules |
| `AccountSettings.jsx` | settings | Platform | Billing, plan, notifications, GDPR |
| `PhoneLines.jsx` | lines | Platform | Phone line management |

### Components
| File | Role |
|------|------|
| `HelpMascot.jsx` | Q mascot — per-page mood, decay logic, coaching panel, "I'm happy" dismissal, hover/zone/dialogue modes |
| `VeraDialogue.jsx` | Draggable Claude Haiku chat panel |
| `ProtectedRoute.jsx` | Auth redirect guard |
| `QBotIcon.jsx` | SVG icon |
| `QMood.jsx` | Legacy inline mood component — **no longer used on any page**, candidate for deletion |

### Q Mood PNG assets — DO NOT MODIFY OR RECREATE
`public/qmood/smile.png` · `content.png` · `sad.png` · `crying.png`
- **Format:** PNG (switched from SVG 2026-06-13 — quality visibly better)
- **Source:** Exported from Recraft by Philip. Philip places files directly into `public/qmood/` himself.
- **Workflow (locked):** Philip copies new files into `public/qmood/` → Claude runs `ls` to verify exact filenames → Claude deploys. Never write image content via chat or Write tool.
- **Code pattern:** `/qmood/${mood}.png` — all four moods PNG, no SVG fallback.
- **Render sizes:** 155px (FloatingBubble) · 170px (HelpMascot face) · 68px (coaching panel header)
- **If files look wrong:** check exact filename with `ls public/qmood/` — double extensions (e.g. `smile.png.png`) are a known gotcha on Windows.

### API endpoints (12/12 — AT CAPACITY)
| File | Route | Purpose |
|------|-------|---------|
| `api/admin.js` | /api/admin | Owner tenant list (service role) |
| `api/chat.js` | /api/chat | vera-chat + support-chat (Claude Haiku) |
| `api/export-data.js` | /api/export-data | GDPR CSV export |
| `api/freeagent-invoice.js` | /api/freeagent-invoice | FreeAgent invoice create |
| `api/freeagent-oauth.js` | /api/freeagent-oauth | FreeAgent + Xero OAuth |
| `api/greeting-generator.js` | /api/greeting-generator | AI greeting generation |
| `api/integrations.js` | /api/integrations | WhatsApp, CalDAV, GBP, Zapier, send-welcome, review-request |
| `api/notify.js` | /api/notify | Daily cost, weekly summary, reminders + `?type=campaign` SMS campaigns (no auth on campaign route) |
| `api/stripe-webhook.js` | /api/stripe-webhook | Stripe billing events |
| `api/vapi-assistant-request.js` | /api/vapi-assistant-request | Dynamic Vapi config per call |
| `api/vapi-sync.js` | /api/vapi-sync | Sync AI settings to Vapi on save |
| `api/vapi-webhook.js` | /api/vapi-webhook | End-of-call: write call_log, leads, referrals |

---

## 9. DATA FLOWS

### Inbound call
```
Phone call → Vapi → /api/vapi-assistant-request
  reads: tenants, staff_profiles, catalogue_items, referral_partners, referral_service_map
  returns: dynamic assistant config (voice, prompt, tools)
  call ends → /api/vapi-webhook
  writes: call_logs, leads, referral_log
  if escalated: SMS to business_phone + email to business_email
```

### Portal load
```
/portal → Portal.jsx
  reads tenant_memberships (user_id → tenant_id)
  reads tenants (name, subscription_tier, listen_tier, etc.)
  sets baseTier, listenTier → derives hasListen, hasScheduleMulti
  renders PRODUCTS nav → sidebar
  tab switch → renders tab component → tab reads its own Supabase data
```

### Owner preview
```
/owner/select → OwnerSelector.jsx
  calls /api/admin (service role, finsolsoffice@gmail.com only)
  returns all tenants
  click tenant → navigate /portal?ownerPreview=<id>&ownerName=<name>
  Portal.jsx reads params → enterPreview() → clears URL
  all mutations blocked by isPreview guard
```

### Onboarding → tenant creation
```
/signup → /onboarding
  step 0: website scrape (Firecrawl + Claude Haiku)
  steps 1-6: business details, AI config, plan selection
  creates: tenants row, tenant_memberships row
  calendar_tier: 'entry' if Schedule purchased, 'none' if Answer-only (IC-06 fixed)
  → /portal
```

---

## 10. GATING LOGIC — INTENT vs CURRENT REALITY

### Intent (product architecture):
```
calendar_tier = 'none'  → Schedule hidden entirely
calendar_tier = 'entry' → Basic calendar visible, team features locked
calendar_tier = 'multi' → Full team calendar, Team tab unlocked
listen_tier = 'none'    → Listen hidden
listen_tier = 'standard'→ Listen visible
```

### Reality (current code — Portal.jsx — all ICs fixed):
```js
// Portal reads: subscription_tier, listen_tier, calendar_tier
const hasSchedule = calendarTier !== 'none'
const hasScheduleMulti = calendarTier === 'multi'
const hasListen = listenTier !== 'none'  // explicit purchase required
```

### Reality (Calendar.jsx):
```js
const effectiveCalendarTier = calendarTierProp || 'entry'  // driven by Portal prop
```

---

## 11. KNOWN ISSUES

Issues are numbered IC-XX. Fix them in order when possible.

### Critical — affect product logic

**IC-01: Schedule not gated in Portal** ✅ Fixed 2026-06-11
Portal now reads `calendar_tier`, derives `hasSchedule = calendarTier !== 'none'`, gates Schedule group.

**IC-02: Calendar effectiveCalendarTier hardcoded 'multi'** ✅ Fixed 2026-06-11
`effectiveCalendarTier = calendarTierProp || 'entry'` — now driven by Portal prop.

**IC-03: Listen auto-unlocks at enterprise** ✅ Fixed 2026-06-11
`const hasListen = listenTier !== 'none'` — explicit purchase required.

**IC-04: Team tab gated on Answer tier, not Schedule tier** ✅ Fixed 2026-06-11
`const hasScheduleMulti = calendarTier === 'multi'` — now calendar-tier driven.

**IC-05: services vs catalogue_items schema split** ✅ Fixed 2026-06-11
BusinessProfile "Your Services" chip section now reads/writes `catalogue_items` (item_type='service'). Services are derived from the same catRes query — no extra DB round trip. `addService` inserts to catalogue_items and updates both `services` + `catalogueItems` state. `removeService` deletes from catalogue_items and syncs both states. `services` table no longer written to from BusinessProfile.

**IC-06: Onboarding always sets calendar_tier = 'entry'** ✅ Fixed 2026-06-11
`calendar_tier: isCalendar ? 'entry' : 'none'` — Answer-only new tenants correctly get 'none'.

### Moderate — dead code / confusion

**IC-07: isDemo ghost in Integrations.jsx** ✅ Fixed 2026-06-11
Removed entirely — all `isDemo` references, prop passing, and sub-component signatures cleaned.

**IC-08: CalendarTab calendarTier prop not passed from Portal** ✅ Fixed 2026-06-11
Portal now passes `calendarTier={calendarTier}` to CalendarTab.

**IC-09: ActivityDashboard tier default 'standard' not 'light'** ✅ Fixed 2026-06-11

**IC-10: Listen tier values not normalised** ✅ Fixed 2026-06-11
SQL migration run: `UPDATE tenants SET listen_tier = 'standard' WHERE listen_tier IN ('premium', 'advanced')`. One tenant updated. Canonical values: 'none' | 'standard'.

**IC-11: Dead state variables in AIBehaviour.jsx** ✅ Fixed 2026-06-11
Removed: `greetingModalShown`, `showProtectedModal`, `generateGreeting`, `CALL_MODES`, `currentMode`, `isEnterprise`, `generatingGreeting`, `numberSaving`, `setGeneratorNotes`.

**IC-12: Dead state in Portal.jsx** ✅ Fixed 2026-06-11
Removed: `isOwner`, `allTenants`, `setAllTenants`, `triageMode`, `tabs`.

**IC-13: `{false && ...}` dead block Portal.jsx** ✅ Fixed 2026-06-11
Holiday widget block deleted.

**IC-14: OwnerSelector unused imports** ✅ Fixed 2026-06-11

**IC-15: PhoneLines tenantId + isPreview unused** ✅ Fixed 2026-06-11
`OfferPage` prop `tenantId` removed (form uses mailto, no DB write needed). `isPreview` destructured from usePreview removed — no preview guard needed here. `usePreview` import removed.

**IC-19: `callers.full_name` vs assumed `name` column** ✅ Verified 2026-06-12
ActivityDashboard uses `callers?.full_name` correctly (callerLabel helper, line 61). ClientDirectory joins `callers(id, full_name, phone_number)` and maps to `name: log.callers?.full_name` (line 82). Both correct — no fix needed.

### Minor — lint / performance

**IC-16: setState-in-effect violations**
Multiple files call setState synchronously inside useEffect body, causing cascading renders.
Files: HelpMascot.jsx (×3), AIBehaviour.jsx, AccountSettings.jsx, PlanSelector.jsx, StaffDirectory.jsx, Onboarding.jsx.
Fix: Low priority unless performance issues arise.

**IC-17: Missing useEffect dependencies**
AIBehaviour, PartnersReferrals, StaffDirectory, OwnerSelector, OwnerAudit, PlanSelector, Onboarding.
Usually intentional (avoid re-run on navigate ref change) — review before treating as bugs.

**IC-18: PlanSelector dead package logic** ✅ Fixed 2026-06-11
PACKAGES array, activePackage state, and applyPackage function removed.

---

## 12. CURRENT BUILD STATE

### Fully built and working
- Auth flow: signup → onboarding → portal (bidirectional guards)
- All 11 portal tabs + 3 Business tabs wired to Supabase
- Vapi call handling end-to-end: webhook → call_log → leads → notifications
- Owner preview mode: /owner/select → preview any tenant (RLS bypass in place)
- AI prompt builder: layers 1-3, catalogue matching, staff extension recognition
- Vera mascot: hover mode, zone mode, Claude Haiku dialogue
- Email pipeline: daily cost, weekly summary, appointment reminders (Resend)
- Urgent escalation: SMS + email on escalated calls
- GDPR: data retention settings, CSV export, delete (two-stage)
- Integrations: Google Calendar/CalDAV, WhatsApp, FreeAgent, Xero OAuth, Zapier, Checkatrade, Rated People, Google Business Profile, review request trigger
- Booking page: /book/:tenantId for customer self-booking
- Stripe: checkout + webhook (needs dashboard setup)
- Calendar: full react-big-calendar with DnD, team mode, appointment modal, split appointments, booking rules, staff schedules
- Staff directory: tag picker, catalogue skills, slide-in panel
- Colour system: saturated palette across all tabs
- Cross-functional warnings: 5 tabs warn on missing config
- 15 real sample tenants seeded covering all feature combinations
- **Meridian Hair & Beauty** (Professional tier) — fully seeded demo business: 45 named clients, 280 call logs (Jan 2025–Jun 2026), 177 leads, 44 client relationships, 20 services + 7 professional hair products in catalogue, 3 staff, 5 referral partners, 34 service→partner mappings, 17 banned_services, 63 upcoming appointments (3 weeks ahead)
- **All 41 other demo tenants** — callers, call_logs, leads, CTR seeded; products seeded for 9 businesses
- **Owner preview Edit mode**: `previewEditable` flag in PreviewContext; banner turns green, "✏ Edit mode / 🔒 Read-only" toggle; write guards use `previewReadOnly` not `isPreview`
- **Staff availability**: `staff_availability` table drives BookingPage date selection; Meridian seeded 15 rows (Priya/Chloe/Marcus, covering Mon–Sun)
- History search: comma/space splitting, `callers(full_name)` join, case-insensitive multi-term
- Client Directory: searchable, hot prospects, opt-out flag, GDPR deletion, SMS campaign composer (tier-gated, "Reply STOP" auto-appended)
- ServiceCatalogue + ProductCatalogue: dedicated full pages, tier-gated quota bars, internal notes
- GDPR compliance: opt-out auto-detection in vapi-webhook.js transcript, deletion_requested flag
- AI Settings: Keep-alive topics (green chips) + max-minutes control — pre-populated for all tenants; injected into AI prompt
- **Q Mood system (redesigned 2026-06-13):** One Q per page — HelpMascot IS the mood Q. Inline QMood panels deleted from all 6 pages. Per-page mood: ai→configPillar, dashboard/listen→perfPillar, integrations→toolPillar, others→globalScore. Dismissal decay: "I'm happy" button stores timestamp in q_dismissals; mood steps sadder by 1/month (smile→content→sad→crying over 4 months); raw score always wins upward. All 4 moods now PNG (`/qmood/${mood}.png`). Performance score is 50/50 blend of all-time + last-10-days call outcomes.
- Conceptual map built from code analysis: CONCEPTUAL_MAP.md (superseded by this file)

### Not yet built
- Mobile tile canvas
- Two-tier Foundation view (tenant-facing polished vs owner editable)
- Sentry tile-based redesign (tile dashboard replacing wizard — in progress 2026-06-12)

---

## 13. NEXT TASKS — IN ORDER

1. ✅ Fixed IC-01–06, IC-08, IC-12–13 — product gating correct. 2026-06-11.
2. ✅ Calendar viewport (Open/Compact toggle, staff stepper, arrow keys, drag-reorder, localStorage). 2026-06-11.
3. ✅ AI Foundation tab (annotated guardrails, computed voice, config summary). 2026-06-11.
4. ✅ Sidebar nav rebuild (product-grouped, collapsible). 2026-06-11.
5. ✅ Dead code sweep (IC-07, IC-09–15, IC-18). 2026-06-11.
6. ✅ Business data pages (ClientDirectory, ServiceCatalogue, ProductCatalogue). 2026-06-11.
7. ✅ BusinessProfile dead code fixed. 2026-06-11.
8. ✅ Keep-alive topics (AI Settings section, prompt injection). 2026-06-11.
9. ✅ Meridian demo seeded (Professional, 280 calls, 45 clients, full catalogue). 2026-06-11.
10. ✅ All 41 demo tenants seeded (callers, call_logs, leads, products). 2026-06-11.
11. ✅ Meridian partners (5 partners, 34 mappings, 17 banned_services). 2026-06-11.
12. ✅ Owner preview Edit mode (previewEditable toggle, banner turns green). 2026-06-11.
13. ✅ Live/Away toggle removed; Q always live. 2026-06-11.
14. ✅ Holiday mode notice removed; permanent AI active bar in ListenTab. 2026-06-11.
15. ✅ Booking link button in Calendar toolbar. 2026-06-11.
16. ✅ History search multi-term fix (callers.full_name join, comma/space split). 2026-06-11.
17. ✅ Meridian hair products seeded (7 professional products). 2026-06-11.
18. ✅ Meridian 63 upcoming appointments seeded (3-week window). 2026-06-11.
19. ✅ Q scoring system (QScoreContext, three-pillar score, Q on 6 pages, HelpMascot mood). 2026-06-12.
20. ✅ ProductCatalogue previewReadOnly fix. 2026-06-12.
21. ✅ Staff gating per tier + PlanSelector staff feature lines. 2026-06-12.
22. ✅ Owner selector Q score (face + score per card, perf sort, admin API scoring). 2026-06-12.
23. ✅ Account & Billing added to sidebar Platform nav. 2026-06-12.
24. ✅ Q coaching panel (pillar bars, 5 action points, red badge when sad). 2026-06-12.
25. ✅ Listen live copilot UI mode (Live tab, caller history, services quick-ref). 2026-06-12.
26. ✅ Schedule-only dazzle nav (special PRODUCTS, Answer upsell strip, auto-redirect). 2026-06-12.
27. ✅ Booking customer fields + PlanSelector "Schedule" rename throughout. 2026-06-12.
28. ✅ Sentry built (5 DB tables, canvas zone editor, variance dashboard, Q-guided wizard). 2026-06-12.
29. ✅ Portal hooks bug fixed (scheduleOnly effect moved before conditional return). 2026-06-12.
30. ✅ Portal.jsx Option C refactor (PortalIcons.jsx, useTenantState.js, 1046→490 lines). 2026-06-12.
31. ✅ Account & Billing → silent salesperson (4-product card grid, active/inactive states). 2026-06-12.
32. ✅ Sidebar sitemap / ⌘K command palette (grouped, keyboard nav, locked badge). 2026-06-12.
33. ✅ Calendar stacking fix — vpOpen default 5 → 10. 2026-06-12.

**Next tasks — in order:**
1. **Sidebar collapsible product groups** — LOST FROM OTHER MACHINE, NEEDS REBUILD. Current sidebar (Portal.jsx) shows all product groups with tabs always visible and colored dots on all headings. Philip had built: collapsible product group headings (click to expand/collapse), glowing animated dot ONLY on products the tenant has active (Answer/Listen/Schedule). This was never committed. Rebuild from description.
2. Sentry tile-based redesign (tile dashboard, staff→station assignment, cameras optional) — IN PROGRESS
3. Clarify calendar tier pricing in PlanSelector (confirm before fixing)
4. Listen multi-term search
5. UX audit: group complex settings into collapsible sections
6. Add AI Behaviour link to owner admin page
7. Investigate Blackwood Restoration staff linking issue in DB

---

## 14. PARKED PRODUCT CONCEPT — QERXEL SENTRY

**Status:** Built (task 28). Wizard-based v1 live. Tile-based redesign in progress (task 33+) — cameras made optional, staff→station assignment added.

### Product positioning
**Inside the portal.** Sentry lives as a gated section within the standard Qerxel portal — uses existing auth, RLS, tenant architecture. Accessible to the account owner only (not staff logins). Sits behind normal portal login; no separate subdomain or second password needed.

**Sold as three things (the hook phrases — confirmed):**
1. **Unlogged Service Detector** — finds services that happened physically but weren't recorded in Schedule
2. **Human Error Detection** — flags data-entry mismatches (wrong service logged, duration mismatch)
3. **Service Time Analyser** — estimated booking duration vs actual chair occupancy time

**⚠️ Language rules — non-negotiable:**
- NEVER use: "revenue leak", "theft", "off-the-books", "missing money", "fraud", "surveillance"
- ALWAYS use: "service reconciliation", "booking accuracy", "data variance", "unlogged service time", "station performance"
- Framing: this is a **data quality tool** — it checks whether what happened physically matches what was logged. The gap could be a data-entry error, a phone booking not entered, a service that ran long. No implication of intent, no implication of staff wrongdoing.

**Paid upgrade** — add-on, not bundled with any base tier. Requires Schedule (needs appointment data for reconciliation).

**Camera reality:** Most service businesses already have CCTV. Sentry activates cameras they already own. No hardware sale, no installation. Pitch: "Your cameras are already watching the shop. Qerxel Sentry reads what they see and cross-checks it against your bookings."

**Compliance framing:** "Operational Efficiency & Station Performance Tool." Processes only pixel-change data per defined zone — no face detection, no biometrics, nothing personal stored or transmitted. Zones are abstract physical locations named by the owner (Chair 1, Wash Basin, Colour Station).

### Pricing (confirmed)
| Cameras | Monthly |
|---|---|
| Up to 3 | £20 |
| Up to 5 | £25 |
| Up to 7 | £30 |
| Up to 9 | £35 |

Base £20 covers up to 3 cameras/zones. Each additional pair of cameras adds £5/mo.

### Report delivery (confirmed)
**Both — email digest + portal depth.**
- Weekly email to owner: headline only — "3 variances found this week. [View Sentry report →]" — nothing sensitive in the email body itself
- Full data lives inside the Sentry section of the portal, behind normal login
- Owner gets the nudge via email but all detail requires authentication to access

### Onboarding — Q-guided setup (slow and deliberate)
Q walks the owner through every step at their pace. No technical knowledge assumed.
- Step 1: "Let's find your camera. Can you see its app on your phone? We need the camera's local IP address — here's how to find it in 3 steps..."
- Step 2: "I'm going to fetch a live snapshot from your camera now. [shows the frame] Does this look right?"
- Step 3: "Now draw a box around your first chair with your mouse. Take your time — you can redraw it as many times as you like."
- Step 4: "What do you call this station? [Chair 1 / Wash Basin / Colour Station / Other]"
- Step 5: Repeat for each zone. "I'm watching Chair 1 now for 5 minutes to make sure I can see activity correctly. I'll tell you what I detect."
- Calibration test: "I saw Chair 1 go from empty to occupied at 14:32. Does that match what actually happened in your shop?"

Q stays present throughout — this is the product differentiator. Competitors would give a PDF setup guide.

### Technical architecture

**Edge:** Owner's existing IP camera, HTTP snapshot URL (`http://[ip]/snapshot.jpg`). Fetched server-side once per minute.

**Zone definition stored:** `{ zone_id, label, camera_id, x, y, w, h }` — crops applied server-side at ingest time.

**Occupancy detection:** Frame N vs Frame N-1 (sharp delta only — no static baseline, immune to gradual light drift). `delta_pct > threshold (50%, adjustable)` → `occupied: 1`, else `0`.

**Time-gate:** Zone must hold `occupied: 1` for ≥ 10 consecutive minutes → registers as a physical session `{ zone_id, start_ts, end_ts, duration_mins }`.

**Reconciliation (no external POS — uses Qerxel's own data):**
| Signal | Finding |
|---|---|
| Station occupied + no Schedule appointment | Revenue leakage / off-books service |
| Station occupied > appointment duration by >20% | Service upgrade not logged |
| Schedule appointment + station never occupied | No-show / DNA |
| Call log re: booking → no appointment created | Lead not converted |
| Weekly: physical chair-hours vs booked hours total | Manual variance report |

**Output:** Owner-only Sentry dashboard — live zone status, flagged session list, weekly variance summary. PDF export (future).

---

## 15. PENDING OWNER DECISIONS

- ✅ "Schedule" confirmed as final product name — PlanSelector updated 2026-06-12. Other files (Calendar.jsx, Portal.jsx nav labels) still reference "Calendar" internally — low priority cleanup.
- Confirm Listen pricing: ~£10/mo + 3-4p/min
- Confirm new tier names/prices when ready to update portal
- Confirm Vera's permanent name
- Stripe: create products/prices in dashboard, set webhook to `https://verante-portal.vercel.app/api/stripe-webhook`, add 7 env vars
- FreeAgent + Xero: create dev OAuth apps, add client ID/secret to Vercel env vars
- Appointment reminders (hourly): set up n8n/Make.com to POST `/api/notify?type=remind` hourly with `Authorization: Bearer <CRON_SECRET>`

---

## 15. OWNER PREVIEW — HOW IT WORKS

Owner email: `finsolsoffice@gmail.com`
Owner selector: `/owner/select`

Flow:
1. Owner logs in → redirected to /owner/select
2. /api/admin returns all tenants (service role, email-gated)
3. Click tenant → navigate `/portal?ownerPreview=<id>&ownerName=<name>`
4. Portal.jsx reads URL params → calls `enterPreview()` → clears URL
5. Amber banner shows "Owner preview · [business name]" with toggle + exit/change buttons
   - "✏ Edit mode" button toggles `previewEditable` — banner turns green, full write access
   - "🔒 Read-only" reverts — banner returns amber, all writes blocked
6. All tab mutations return early on `previewReadOnly` check (not `isPreview` — allows edit mode)
7. "Exit preview" → `exitPreview()` → `setActiveTab('dashboard')`
8. "Change business" → `exitPreview()` → navigate `/owner/select`

RLS bypass: `supabase_owner_rls.sql` — already run. Grants SELECT on 13 tables for owner email.

---

*Last updated: 2026-06-13*
*Updated by: session — Q Mood full redesign (one Q per page, per-page mood, dismissal decay, PNG images); inline QMood removed from 6 pages; q_dismissals column added to tenants; sidebar collapsible work documented as lost/needs rebuild*
