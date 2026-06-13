# QERXEL — SINGLE SOURCE OF TRUTH
## This file is auto-loaded by Claude Code at the start of every session.
## READ THIS FILE IN FULL BEFORE DOING ANYTHING ELSE.
## UPDATE THIS FILE BEFORE ENDING ANY SESSION.

---

## HOW TO USE THIS DOCUMENT

This is the single authoritative reference for the Qerxel project. It contains truth derived from actual code analysis, not aspirational descriptions. When this document and the code disagree, investigate — one of them is wrong.

**Truth hierarchy:** This file > code reality > any archived handoff doc

---

## SESSION PROTOCOL — MANDATORY

### Every session start — no exceptions

Whatever the opening prompt says, the first response is always:
> "Before we start — give me 5–10 minutes to run the session check."

Then run in order:
1. Read this file in full
2. `git log --oneline -10` — see what was actually built since last session
3. Flag any section not verified against code in the last 7 days as suspect
4. Confirm session scope in one sentence with Philip before writing any code

### Scope discipline
- **Explicit instructions only.** No inference, no unilateral additions.
- If something is directly part of what's being built right now → proceed
- If it's adjacent or new → say "noted, adding to the queue" and continue
- Never silently expand scope

### Strategy discussions
- Philip's strategy messages are intentionally messy — he's drawing ideas together
- Claude's job: receive, hold, condense into clean decisions. Do not act on raw thoughts.
- Wait for explicit "go" before any code is written
- Browser Claude (claude.ai) and this conversation share no context — all strategy lives here

### Battle plan format — required before any build
Write this in the conversation and wait for Philip to say "go":
```
PLAN — [feature name]
Files changing: [list]
What changes: [numbered steps]
Adjacent files touched: [anything that imports or is imported by changed files]
Known risks: [anything that could go wrong]
```

### Every session end — no exceptions
- Mark completed tasks ✅ Done with date
- Update Known Issues (add new, remove resolved)
- Update Next Tasks queue
- Stamp any sections verified against actual code: `*Verified: YYYY-MM-DD*`
- Update "Last updated" at bottom of file

---

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
| Vera/Q AI | Claude Haiku (vera-chat, support-chat, greeting-generator, scrape-website) |

**Supabase:**
- URL: https://kkrsvkxkefijmtbwykzv.supabase.co
- Anon key (HS256 — ALWAYS use this, NEVER use sb_publishable_): in `src/supabase.js`
- Service role key: in Vercel env vars only, never in frontend
- RLS: ENABLED on all tables. Owner bypass: `supabase_owner_rls.sql` (already run)
- SQL access: `POST https://api.supabase.com/v1/projects/kkrsvkxkefijmtbwykzv/database/query` with `Authorization: Bearer <SUPABASE_PAT>`. PAT is in `.env` as `SUPABASE_PAT`. **⚠️ PAT expires — regenerate at supabase.com/dashboard/account/tokens if SQL calls return 401.**

**GitHub:** https://github.com/philsk1/verante-portal
**Live URL:** https://verante-portal.vercel.app
**Deploy:** Push to GitHub master → GitHub auto-deploy triggers on single-R live site. Manual `vercel deploy --prod` goes to double-R stale project (`.vercel/project.json` is linked to verrante-portal) — do NOT use manual deploy.
**Note:** A second stale Vercel project exists at verrante-portal.vercel.app (double-r) — it is old, unused, and safe to ignore.

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
- **Vera/Q speeches:** column is `context_key` (not `speech_key`)
- **API limit:** 12/12 Vercel Hobby — AT CAPACITY. No new API files without consolidating first.
- **Deploy:** Push to GitHub master — auto-deploy to single-R live site. Do NOT use `vercel deploy --prod` from local.
- **SQL via management API:** use Node.js with `NODE_OPTIONS=--use-system-ca` — curl fails on Windows/Node 24
- **Source of truth:** GitHub remote is authoritative. Always `git pull` at session start. Local machine can break or be rebuilt.

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
- `calendar_tier = 'none'` — RETIRED. All tenants get minimum 'entry'.

### Listen (augmentation layer)
Real-time AI screen copilot activated when owner picks up a call themselves. Surfaces context on screen: creates bookings as they speak, shows customer history, suggests catalogue items.
- Requires Answer OR paid Schedule to function (needs telephony infrastructure)
- Cannot stand alone
- `listen_tier = 'none'` — not purchased
- `listen_tier = 'standard'` — active

### Product combinations and nav structure (INTENT — not yet fully implemented)

**Answer only:**
```
ANSWER → Home · Analytics · Answer AI
BUSINESS → Partners · Business Profile · Integrations · Lines
```

**Answer + Schedule:**
```
ANSWER → Home · Analytics · Answer AI
SCHEDULE → Calendar · Team
BUSINESS → Partners · Business Profile · Integrations · Lines
```

**Answer + Listen:**
```
ANSWER → Home · Analytics · Answer AI
LISTEN → Listen
BUSINESS → Partners · Business Profile · Integrations · Lines
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
| `vera_seen` | Vera/Q speeches seen | HelpMascot | HelpMascot |
| `vera_speeches` | Vera/Q speech content | (SQL seed) | HelpMascot |
| `tenant_feedback` | Product feedback | AccountSettings | — |
| `sentry_stations` | Sentry station definitions | SentryTab | SentryTab |
| `sentry_cameras` | Camera config | SentryTab | SentryTab |
| `sentry_sessions` | Detected occupancy sessions | (future: ingest worker) | SentryTab |
| `sentry_variances` | Flagged data variances | SentryTab | SentryTab |

**NOTE: `callers` table uses `full_name` column, NOT `name`.**

**`tenants` columns relevant to products:** `subscription_tier`, `listen_tier`, `sentry_tier`, `calendar_tier`, `lines_tier`

**`campaigns` table:** tracks SMS campaign sends. Columns: `id, tenant_id, name, message, recipient_count, sent_count, failed_count, status, search_context, created_at, sent_at`. RLS enabled.

---

## 8. FILE MAP — VERIFIED 2026-06-13

### Core
| File | Role |
|------|------|
| `src/main.jsx` | Vite entry |
| `src/App.jsx` | Router (AuthProvider + PreviewProvider wrap all routes) |
| `src/supabase.js` | Supabase client — anon key |

### Contexts
| File | Provides |
|------|---------|
| `src/context/AuthContext.jsx` | user, session, signOut |
| `src/context/PreviewContext.jsx` | user, session, signOut |

### Routes
| Path | Component | Auth |
|------|-----------|------|
| `/login` | Login.jsx | public |
| `/signup` | Signup.jsx | public |
| `/onboarding` | Onboarding.jsx | protected |
| `/portal` | Portal.jsx | protected |
| `/owner/select` | OwnerSelector.jsx | protected (owner only) |
| `/plans` | PlanSelector.jsx | protected |
| `/book/:tenantId` | BookingPage.jsx | public |

### Portal shell
`src/pages/Portal.jsx` — ~290 lines. Owns tenant state, auth/preview checks, tab routing, preview banner, mobile nav. Imports PortalSidebar for all desktop sidebar rendering.

`src/pages/PortalSidebar.jsx` — ~350 lines. Collapsible product sections with localStorage persistence. Favourites pins. Lines product group (teal). Notification panel. Collapse toggle. Bottom icon row. All 14 exported icon components + Toggle.

### Tab files
| File | Tab ID | Product | Notes |
|------|--------|---------|-------|
| `ActivityDashboard.jsx` | dashboard | Answer | Zone 1/2/3 lead funnel |
| `AIBehaviour.jsx` | ai | Answer | Vapi config, prompt builder, tone/triage |
| `DataAnalytics.jsx` | analytics | Answer | Charts, enterprise-gated intel |
| `PartnersReferrals.jsx` | referrals | Answer/Business | Partner management, referral network |
| `ListenTab.jsx` | listen | Listen | Transcript archive, multi-term AND search on all tabs |
| `Calendar.jsx` | calendar | Schedule | react-big-calendar, DnD, team mode |
| `CalendarIntelligence.jsx` | (sub-component) | Schedule | Intelligence Hub — efficiency/profit overlay |
| `StaffDirectory.jsx` | team | Schedule | Staff cards, slide-in panel, tag picker |
| `SentryTab.jsx` | sentry | Sentry | Upsell gate, Q-guided setup, station tiles, variance log |
| `BusinessProfile.jsx` | profile | Business | Business config, catalogue chips |
| `AccountSettings.jsx` | settings | Platform | Billing, plan, notifications, GDPR. 4-product card grid + Lines tile. |
| `Integrations.jsx` | integrations | Platform | Integration modules |
| `PhoneLines.jsx` | lines | Platform | Phone line management |

### Components
| File | Role |
|------|------|
| `HelpMascot.jsx` | Vera/Q owl — hover explain, zone mode, dialogue trigger. `vera-ask-btn` id on Ask Q button. |
| `VeraDialogue.jsx` | Draggable Claude Haiku chat panel |
| `ProtectedRoute.jsx` | Auth redirect guard |
| `QBotIcon.jsx` | SVG icon |
| `MoodQ.jsx` | Reusable mood Q at points of interest. Props: mood, reason, tip, size. Non-smiling moods clickable → 'Q says' popover with rule-based text. No API call. |

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
| `api/notify.js` | /api/notify | Daily cost, weekly summary, reminders + `?type=campaign` SMS campaigns |
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
  reads tenants (business_name, subscription_tier, listen_tier, sentry_tier, calendar_tier, holiday_mode, notify_*, urgent_outcomes)
  derives: hasListen (listenTier !== 'none' || enterprise+), hasSentry (sentry_tier !== 'none')
  renders PortalSidebar → tab switch → tab component reads its own Supabase data
```

### Owner preview
```
/owner/select → OwnerSelector.jsx
  calls /api/admin (service role, finsolsoffice@gmail.com only)
  returns all tenants
  click tenant → navigate /portal?ownerPreview=<id>&ownerName=<name>
  Portal.jsx reads params → enterPreview() → navigate /portal (clears URL)
  amber banner shows with "Change business" + "Exit preview"
  all tab mutations blocked by preview.isPreview guard
  quick-access row per card: Dashboard / AI Settings / Calendar
```

### Onboarding → tenant creation
```
/signup → /onboarding
  step 0: website scrape (Firecrawl + Claude Haiku)
  steps 1-6: business details, AI config, plan selection
  creates: tenants row, tenant_memberships row
  → /portal
```

---

## 10. GATING LOGIC — CURRENT REALITY

```js
// All tenants get calendar — minimum 'entry'. calendar_tier = 'none' is retired.
const hasListen = listenTier !== 'none' || ['enterprise','bespoke'].includes(baseTier)
const hasSentry = sentry_tier != null && sentry_tier !== 'none'
// Calendar + Team always show (everyone gets calendar)
// Listen: PortalSidebar conditionally adds Listen product section
// Sentry: PortalSidebar conditionally adds Sentry product section
// StaffDirectory: add-member button gates on calendarTier === 'multi'
```

---

## 11. KNOWN ISSUES

Issues are numbered IC-XX. Fix them in order when possible.

### Critical — affect product logic

**IC-SQL-01: Tenants with calendar_tier = NULL need migration**
`UPDATE tenants SET calendar_tier = 'entry' WHERE calendar_tier IS NULL OR calendar_tier = 'none';`
Cannot run automatically — SUPABASE_PAT is expired. Philip must regenerate at supabase.com/dashboard/account/tokens and update .env.local, then run this migration.

**IC-DEMO-01: Demo orphan cleanup (deferred)**
DemoContext is imported by AccountSettings, ActivityDashboard, AIBehaviour. Full cleanup requires updating all those files.
Files to remove eventually: DemoPortal.jsx, DemoLogin.jsx, DemoContext.jsx, BusinessSelector.jsx, TierSelector.jsx, SalesPerformance.jsx.
Blocker: demo@qerxel.app flow must be migrated to owner-preview first.

### Moderate — dead code / confusion

**IC-11: Dead state variables in AIBehaviour.jsx**
`greetingModalShown` and `showProtectedModal` still exist despite being unused.

### Minor — lint / performance

**IC-16: setState-in-effect violations**
Multiple files call setState synchronously inside useEffect body.
Files: HelpMascot.jsx, AIBehaviour.jsx, AccountSettings.jsx, PlanSelector.jsx, StaffDirectory.jsx, Onboarding.jsx.
Low priority unless performance issues arise.

**IC-17: Missing useEffect dependencies**
AIBehaviour, PartnersReferrals, StaffDirectory, OwnerSelector, PlanSelector, Onboarding.
Usually intentional — review before treating as bugs.

### Resolved ✅
- IC-01, IC-02, IC-04, IC-08: Calendar gating fixed (2026-06-12)
- IC-03: `hasListen` correct (confirmed in code)
- IC-12, IC-13: Dead state in Portal.jsx removed (2026-06-12)

---

## 12. CURRENT BUILD STATE

### Confirmed built and working (verified from code 2026-06-13)
- Auth flow: signup → onboarding → portal (bidirectional guards)
- Portal shell: PortalSidebar.jsx with collapsible product sections (localStorage), Favourites pins, Lines product group (teal), notification panel, collapse toggle
- Portal.jsx: ~290 lines, imports PortalSidebar, all sidebar props passed via handleNotifChange bridge
- Owner preview mode: /owner/select → amber banner → all mutations blocked. Quick-access row per card (Dashboard/AI Settings/Calendar).
- All standard tabs wired to Supabase: Dashboard, AI Settings, Analytics, Partners, Business Profile, Integrations, Account Settings, Phone Lines, Listen, Calendar (team mode), Staff Directory
- Vapi call handling end-to-end: webhook → call_log → leads → notifications
- AI prompt builder: layers 1-3, catalogue matching, staff extension recognition
- Vera/Q mascot: hover mode, zone mode, Claude Haiku dialogue. `vera-ask-btn` id correctly targets Ask Q button.
- Email pipeline: daily cost, weekly summary, appointment reminders (Resend)
- Urgent escalation: SMS + email on escalated calls
- GDPR: data retention settings, CSV export, delete (two-stage) in AccountSettings
- Integrations: Google Calendar/CalDAV, WhatsApp, FreeAgent, Xero OAuth, Zapier, Checkatrade, Rated People, Google Business Profile, review request trigger
- Booking page: /book/:tenantId for customer self-booking
- Stripe: checkout + webhook (needs dashboard config)
- Calendar: full react-big-calendar with DnD, team mode, appointment modal, Intelligence Hub overlay
- Staff directory: tag picker, catalogue skills, slide-in panel
- **Sentry: SentryTab.jsx built** (upsell gate, Q-guided station setup, tile grid, variance log) — SQL migration (`supabase_sentry.sql`) written but **not yet run**. `sentry_tier` column not yet in DB.
- AccountSettings: 4-product card grid (Answer/Schedule/Listen/Sentry) + Lines compact tile. Reads `sentry_tier` and `lines_tier` from DB.
- ListenTab: multi-term AND search on all tabs (archive, live copilot)
- Demo system: REMOVED from remote. Orphan cleanup deferred (IC-DEMO-01).
- **MoodQ.jsx built ✅ 2026-06-13** — reusable clickable mood Q component deployed to ActivityDashboard (perfMood, call volume) and AIBehaviour (configMood, greeting/booking completeness). qmood SVGs: content/sad/crying blob-stripped. smile.svg = content.svg placeholder (awaiting Philip's actual smiling illustration).
- OwnerSelector: 8-pill sort dimensions, Q mood + score chips, 44px Q image.
- OwnerSelector `qMood()` scoring: productScore + dataScore + perfScore → crying/sad/content/smile.

### Not built (claimed in prior docs — does not exist in code)
- `src/context/QScoreContext.jsx` — Q scoring system not built
- `src/pages/OwnerAudit.jsx` — not built
- `src/pages/ClientDirectory.jsx` — not built
- `src/pages/ServiceCatalogue.jsx` — not built
- `src/pages/ProductCatalogue.jsx` — not built
- Owner preview Edit mode (previewEditable, green banner, read-only toggle) — not built
- Q scoring system (three-pillar score, coaching panel, badge) — not built
- ⌘K Command palette — not built
- Schedule-only dazzle nav — not built
- Account & Billing product card grid (silent salesperson) — built ✅ (AccountSettings has it now)
- Listen live copilot UI mode — built ✅ (ListenTab has mode switcher)

### Unknown — not audited yet
- Whether Onboarding correctly sets `calendar_tier` on tenant creation
- Whether ActivityDashboard tier default is 'light' or 'standard'
- Whether BusinessProfile reads/writes `catalogue_items` correctly
- Whether keep-alive topics exist in AI Settings UI

---

## 13. NEXT TASKS — IN ORDER

**Priority 1 ✅ Done 2026-06-12 — calendar gating fixed (IC-01, IC-02, IC-04, IC-08)**

**Priority 2 — run SQL migrations (needs fresh PAT):**
Regenerate PAT at supabase.com/dashboard/account/tokens, update .env.local, then run:
1. `supabase_sentry.sql` — creates sentry_* tables, adds sentry_tier column
2. `UPDATE tenants SET calendar_tier = 'entry' WHERE calendar_tier IS NULL OR calendar_tier = 'none';`

**Priority 3 — build missing Business data pages:**
`ClientDirectory.jsx`, `ServiceCatalogue.jsx`, `ProductCatalogue.jsx`
BusinessProfile currently links to these — they need to exist.

**Priority 4 ✅ Done 2026-06-12 — dead code cleanup (IC-11, IC-12, IC-13)**

**Priority 5 — Owner preview Edit mode:**
PreviewContext: `previewEditable` state, `previewReadOnly` computed (= isPreview && !previewEditable), toggle via `setPreviewEditable`.
Portal banner: amber → green when editing. Write guards: `isPreview` → `previewReadOnly`.

**Priority 6 — Q scoring system:**
QScoreContext: three pillars (Setup 40%, Activity 35%, Follow-up 25%), combined 0-100 score, mood.
Portal sidebar Q score pill + coaching panel.

**Priority 7 ✅ Done 2026-06-13 — Account & Billing product card grid + Lines tile (AccountSettings.jsx)**

**Queue (in order — battle plan required before starting each):**

*Site integrity ✅ Done 2026-06-13:*
Portal.jsx split complete. PortalSidebar.jsx created (~350 lines). Portal.jsx reduced to ~290 lines.
Collapsible sections with localStorage persistence. Favourites pins. Lines product group.

*IC-DEMO-01 — Demo orphan cleanup (deferred):*
DemoContext is deeply imported by 3+ tab files. Medium priority, deferred.

*Feature queue (in order):*
- Add AI Behaviour link to owner admin page
- Listen multi-term search ✅ Done 2026-06-13
- OwnerSelector quick-access row ✅ Done 2026-06-13
- MoodQ clickable component ✅ Done 2026-06-13 (ActivityDashboard + AIBehaviour)
- smile.svg proper fix: Philip to reshare actual smiling illustration (currently using content.svg as placeholder)
- Investigate Blackwood Restoration staff linking issue in DB (needs fresh SUPABASE_PAT)
- UX audit: group complex settings into collapsible sections
- Schedule pricing model (dimension-based) — park until strategy session
- Owner preview Edit mode (Priority 5 above)
- Q scoring system (Priority 6 above)
- ⌘K Command palette
- Schedule-only dazzle nav (parked — all tenants have Answer currently)

---

## 14. PARKED PRODUCT CONCEPT — QERXEL SENTRY

**Status:** SentryTab.jsx built. SQL migration written (supabase_sentry.sql). Not yet deployed/activated — migration not run, `sentry_tier` column not in DB.

### Product positioning
Inside the portal. Gated add-on — requires Schedule (needs appointment data for reconciliation).

**Sold as three things:**
1. **Unlogged Service Detector** — finds services that happened physically but weren't recorded in Schedule
2. **Human Error Detection** — flags data-entry mismatches (wrong service logged, duration mismatch)
3. **Service Time Analyser** — estimated booking duration vs actual chair occupancy time

**⚠️ Language rules — non-negotiable:**
- NEVER use: "revenue leak", "theft", "off-the-books", "missing money", "fraud", "surveillance"
- ALWAYS use: "service reconciliation", "booking accuracy", "data variance", "unlogged service time", "station performance"

### Pricing (confirmed)
| Cameras | Monthly |
|---|---|
| Up to 3 | £20 |
| Up to 5 | £25 |
| Up to 7 | £30 |
| Up to 9 | £35 |

### Technical architecture
**Edge:** Owner's existing IP camera, HTTP snapshot URL. Fetched server-side once per minute.
**Zone detection:** Frame delta per defined zone. `delta_pct > 50%` → occupied. Hold ≥10 min → session.
**Reconciliation:** Cross-reference sessions against Schedule appointments. Variances logged to `sentry_variances`.

---

## 15. PENDING OWNER DECISIONS

- Confirm Listen pricing: ~£10/mo + 3-4p/min
- Confirm tier names/prices when ready to update portal
- Confirm Vera's permanent name (currently referred to as "Q" or "Vera" interchangeably)
- Stripe: create products/prices in dashboard, set webhook to `https://verante-portal.vercel.app/api/stripe-webhook`, add 7 env vars
- FreeAgent + Xero: create dev OAuth apps, add client ID/secret to Vercel env vars
- Appointment reminders (hourly): set up n8n/Make.com to POST `/api/notify?type=remind` hourly with `Authorization: Bearer <CRON_SECRET>`
- Schedule pricing model: dimension-based (stations × service list × product list × marketing bundle) — parked

---

## 16. OWNER PREVIEW — HOW IT WORKS

Owner email: `finsolsoffice@gmail.com`
Owner selector: `/owner/select`

Flow:
1. Owner logs in → redirected to /owner/select
2. /api/admin returns all tenants (service role, email-gated)
3. Click tenant card body → navigate `/portal?ownerPreview=<id>&ownerName=<name>`
4. Quick-access row buttons (Dashboard/AI Settings/Calendar) → navigate with `&tab=<id>`
5. Portal.jsx reads params → calls `enterPreview()` → navigate('/portal') clears URL
6. Amber banner shows "Owner preview · [business name]" with "← Change business" + "Exit preview"
7. All tab mutations return early on `preview.isPreview` check
8. "Exit preview" → `exitPreview()` → `setActiveTab('dashboard')`
9. "Change business" → `exitPreview()` → navigate `/owner/select`

RLS bypass: `supabase_owner_rls.sql` — already run. Grants SELECT on tables for owner email.

---

*Last updated: 2026-06-13*
*Updated by: MoodQ.jsx built and deployed to ActivityDashboard (perfMood) and AIBehaviour (configMood). OwnerSelector 8-pill sort + Q mood scoring. qmood SVG blobs stripped. smile.svg placeholder (awaiting real smiling illustration from Philip). MoodQ.jsx added to components table.*
