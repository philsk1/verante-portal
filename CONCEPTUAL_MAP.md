# QERXEL — CONCEPTUAL MAP
## Living reference. Update at end of every session that changes architecture.
## Built: 2026-06-11 via automated structural scan + cross-reference audit.

---

## 1. WHAT THIS SYSTEM IS

AI call-handling SaaS for UK sole traders and micro-businesses.
Core promise: "Never miss another lead."
Scale target: 500 tenants before any tech hire. All dev via Claude Code.

**Three products:**

| Product | Type | Gate |
|---------|------|------|
| Answer | Standalone | subscription_tier (light/standard/professional/enterprise/bespoke) |
| Schedule | Standalone | calendar_tier (none / entry / multi) |
| Listen | Augmentation | listen_tier (none / standard) — requires Answer OR paid Schedule |

**Answer is the competitive battleground. Schedule is the market entry door.**
Schedule basic (entry) is always free with any purchase and is the Trojan horse.
Listen augments live human-answered calls — not standalone.

---

## 2. TIER STRUCTURE

| Tier | Price | Minutes | Concurrent |
|------|-------|---------|-----------|
| free | £0 PAYG (35p/min) | 0 | 1 |
| light | £29/mo | 120 | 1 |
| standard | £49/mo | 250 | 1 |
| professional | £69/mo | 450 | 2 |
| enterprise | £249/mo | 1,000 | 3+ |
| bespoke | Custom | Custom | Custom |

**Canonical tier check pattern (use this everywhere):**
```js
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

---

## 3. DATABASE — TABLE INVENTORY

| Table | Purpose | Used by |
|-------|---------|---------|
| tenants | Core tenant record — all config, tiers, AI settings | Nearly every file |
| tenant_memberships | Links auth.users → tenants (user_id, tenant_id) | Portal.jsx, all tab files |
| staff_profiles | Team members per tenant | StaffDirectory, Calendar, Portal |
| staff_availability | Working hours per staff member per day | Calendar |
| appointments | Booked appointments | Calendar, BookingPage |
| catalogue_items | Service/product catalogue — AI uses this for matching | Calendar, BusinessProfile, CalendarIntelligence |
| services | LEGACY service list — used by BusinessProfile + Onboarding | BusinessProfile, Onboarding ⚠️ |
| banned_services | Topics/services AI should not handle | BusinessProfile, PartnersReferrals, _build-prompt |
| referral_partners | Partner businesses per tenant | PartnersReferrals, _build-prompt |
| referral_service_map | Maps caller intent keywords to partners | _build-prompt |
| referral_log | Log of referral actions | PartnersReferrals |
| leads | Captured leads from calls | ActivityDashboard, vapi-webhook |
| callers | Caller phone number records | ActivityDashboard |
| caller_tenant_relationships | Per-caller relationship context | (session 4 migration — partially used) |
| call_logs | Every call record | ActivityDashboard, DataAnalytics, ListenTab |
| tenant_catalogue | Enterprise website-scraped content for AI matching | CalendarIntelligence |
| vera_seen | Tracks which Vera speeches user has seen | HelpMascot |
| vera_speeches | Vera's pre-written context speeches per tab | HelpMascot |
| tenant_feedback | Product feedback | (wired in AccountSettings) |

**⚠️ SCHEMA SPLIT — services vs catalogue_items:**
Two tables serve similar purposes. `services` is the legacy table (BusinessProfile "Services" section, Onboarding). `catalogue_items` is the modern table (Calendar booking, AI matching, CalendarIntelligence). The AI reads ONLY catalogue_items. BusinessProfile currently writes to BOTH separately. This creates a disconnected state where services exist but the AI doesn't know about them.

---

## 4. FILE MAP

### Entry points
| File | Role |
|------|------|
| `src/main.jsx` | Vite entry — mounts App |
| `src/App.jsx` | Router — AuthProvider + PreviewProvider wrap all routes |
| `src/supabase.js` | Supabase client — HS256 anon key only |

### Routes
| Path | Component | Guard |
|------|-----------|-------|
| /login | Login.jsx | public |
| /signup | Signup.jsx | public |
| /onboarding | Onboarding.jsx | ProtectedRoute |
| /portal | Portal.jsx | ProtectedRoute |
| /owner/select | OwnerSelector.jsx | ProtectedRoute (owner email only) |
| /owner/audit | OwnerAudit.jsx | ProtectedRoute (owner email only) |
| /plans | PlanSelector.jsx | ProtectedRoute |
| /book/:tenantId | BookingPage.jsx | public |
| * | → /login | redirect |

### Contexts
| File | Provides |
|------|---------|
| `AuthContext.jsx` | user, session, signOut — wraps Supabase auth |
| `PreviewContext.jsx` | isPreview, previewTenantId, previewBusinessName, enterPreview, exitPreview, tierOverride, setTierOverride |

### Portal shell
`Portal.jsx` — the main shell. Renders the sidebar nav + tab content. Owns:
- baseTier, listenTier (from tenants SELECT)
- activeTab routing
- PRODUCTS array (product groups → nav items)
- Preview banner
- Mobile bottom nav

**Portal does NOT read calendar_tier — ⚠️ Schedule gating is missing (see §6)**

### Tab files (all receive onNavigate + use useAuth + usePreview)
| File | Tab ID | Product Group | Notes |
|------|--------|--------------|-------|
| ActivityDashboard.jsx | dashboard | Answer | Zone 1/2/3 layout. Reads listen_tier + calendar_tier locally |
| AIBehaviour.jsx | ai | Answer | Vapi assistant config + prompt builder |
| DataAnalytics.jsx | analytics | Answer | Charts, enterprise-gated intel |
| PartnersReferrals.jsx | referrals | Answer | Referral network management |
| ListenTab.jsx | listen | Listen | Transcript archive + copilot stub |
| Calendar.jsx | calendar | Schedule | Full calendar — ⚠️ effectiveCalendarTier hardcoded 'multi' |
| StaffDirectory.jsx | team | Schedule | Team cards + availability |
| BusinessProfile.jsx | profile | Platform | Business config + services + catalogue |
| Integrations.jsx | integrations | Platform | Integration module framework — ⚠️ isDemo ghost |
| AccountSettings.jsx | settings | Platform | Billing, notifications, plan, data |
| PhoneLines.jsx | lines | Platform | Phone line management — ⚠️ tenantId/isPreview unused |

### Components
| File | Role |
|------|------|
| HelpMascot.jsx | Vera owl — hover explain mode, zone mode, dialogue trigger |
| VeraDialogue.jsx | Draggable Claude Haiku chat panel |
| ProtectedRoute.jsx | Auth redirect guard |
| QBotIcon.jsx | SVG icon component |

### API endpoints (12/12 Vercel Hobby limit — AT CAPACITY)
| File | Route | Purpose |
|------|-------|---------|
| admin.js | /api/admin | Owner tenant list (service role) |
| chat.js | /api/chat | vera-chat + support-chat (Claude Haiku) |
| export-data.js | /api/export-data | GDPR data export CSV |
| freeagent-invoice.js | /api/freeagent-invoice | FreeAgent invoice create |
| freeagent-oauth.js | /api/freeagent-oauth | FreeAgent + Xero OAuth handler |
| greeting-generator.js | /api/greeting-generator | AI greeting generation |
| integrations.js | /api/integrations | Multi-action: WhatsApp, CalDAV, GBP, Zapier, send-welcome, review request |
| notify.js | /api/notify | Daily cost, weekly summary, appointment reminders |
| stripe-webhook.js | /api/stripe-webhook | Stripe billing events |
| vapi-assistant-request.js | /api/vapi-assistant-request | Dynamic Vapi assistant config per call |
| vapi-sync.js | /api/vapi-sync | Sync AI settings to Vapi on save |
| vapi-webhook.js | /api/vapi-webhook | End-of-call: write call_log, leads, referrals |

---

## 5. DATA FLOW

### Call flow (inbound)
```
Phone call → Vapi → /api/vapi-assistant-request
  → reads tenant config + staff + catalogue_items + referral_partners
  → returns dynamic assistant config
  → call happens
  → /api/vapi-webhook (end of call)
  → writes call_log, leads, referral_log
  → sends urgent escalation SMS/email if needed
```

### Portal load flow
```
/portal → Portal.jsx
  → reads tenant_memberships (user_id → tenant_id)
  → reads tenants (business_name, subscription_tier, listen_tier, etc.)
  → sets baseTier, listenTier
  → renders PRODUCTS nav array
  → tab switch → renders tab component
  → tab component reads its own data from Supabase
```

### Owner preview flow
```
/owner/select → OwnerSelector.jsx
  → /api/admin (service role, email-gated) → all tenants
  → click tenant → navigate /portal?ownerPreview=<id>&ownerName=<name>
  → Portal.jsx reads params → calls enterPreview() → cleans URL
  → all tab mutations guarded by isPreview check
```

### Onboarding → tenant creation
```
Signup → /onboarding
  → step 0: website scrape (Firecrawl + Claude Haiku)
  → steps 1-6: business details, AI config, plan selection
  → creates: tenants row, tenant_memberships row
  → redirects → /portal
```

---

## 6. GATING LOGIC — CURRENT STATE VS INTENT

### What SHOULD gate what (product architecture intent):
```
subscription_tier → Answer features (minutes, concurrent, staff count limits)
listen_tier       → Listen product visibility + features
calendar_tier     → Schedule product visibility + features
  'none'          → Schedule hidden entirely
  'entry'         → Basic single-staff calendar visible
  'multi'         → Multi-staff team calendar unlocked
```

### What ACTUALLY gates what (current code):

**Portal.jsx nav gating:**
```js
const hasListen = listenTier !== 'none' || ['enterprise', 'bespoke'].includes(baseTier)
const hasScheduleMulti = ['professional', 'enterprise', 'bespoke'].includes(baseTier)
```
- Listen: gated on listen_tier OR enterprise tier — ⚠️ enterprise auto-unlocks Listen without purchase
- Schedule: ALWAYS visible — no calendar_tier gate in Portal at all — ⚠️ Answer-only tenants see Schedule
- Team tab within Schedule: gated on subscription_tier (professional+) — ⚠️ should be on calendar_tier = 'multi'

**Calendar.jsx:**
```js
const effectiveCalendarTier = 'multi'  // hardcoded
```
⚠️ Every tenant always gets full multi-staff calendar, regardless of calendar_tier

**Portal.jsx SELECT does not include calendar_tier:**
```js
.select('business_name, holiday_mode, ... subscription_tier, triage_mode, urgent_outcomes, listen_tier')
```
⚠️ calendar_tier is never loaded into Portal state — cannot gate Schedule correctly

---

## 7. INCONSISTENCIES CATALOGUE

### Critical (affect product logic)

**IC-01: Schedule not gated in Portal**
Portal.jsx never reads or uses `calendar_tier`. Schedule nav group always renders for all tenants. All 7 Answer-only seeded tenants (`calendar_tier = 'none'`) will see Schedule.
**Fix:** Add `calendar_tier` to Portal SELECT, add `hasSchedule` derived state, gate Schedule group on it.

**IC-02: Calendar effectiveCalendarTier hardcoded 'multi'**
`Calendar.jsx:831: const effectiveCalendarTier = 'multi'`
Every tenant gets full team calendar regardless of what they purchased.
**Fix:** Pass calendarTier prop from Portal, use it in Calendar.jsx.

**IC-03: Listen auto-unlocks at enterprise**
`hasListen = listenTier !== 'none' || ['enterprise', 'bespoke'].includes(baseTier)`
Enterprise tenants get Listen even with listen_tier = 'none'. Contradicts Listen-as-explicit-purchase architecture.
**Fix:** Remove the enterprise auto-unlock. Listen should only show when `listen_tier !== 'none'`.

**IC-04: Team tab gated on subscription_tier not calendar_tier**
`hasScheduleMulti = ['professional', 'enterprise', 'bespoke'].includes(baseTier)`
Team tab unlocks based on Answer tier, not Schedule tier. A professional Answer-only tenant (no calendar) gets the Team tab unlocked.
**Fix:** Gate Team on `calendarTier === 'multi'`.

**IC-05: services vs catalogue_items schema split**
`BusinessProfile.jsx` writes services to the legacy `services` table. The AI (`_build-prompt.js`, `CalendarIntelligence.jsx`) reads only from `catalogue_items`. Anything entered in the BusinessProfile "Services" section is invisible to the AI.
**Fix:** Either migrate services → catalogue_items and remove the legacy table, OR wire BusinessProfile to write catalogue_items.

**IC-06: Onboarding always sets calendar_tier = 'entry'**
`calendar_tier: isCalendar ? 'entry' : 'entry'` — both branches identical. New tenants cannot get `calendar_tier = 'none'` through onboarding.
**Fix:** `calendar_tier: isCalendar ? 'entry' : 'none'`

### Moderate (dead code / confusion)

**IC-07: isDemo ghost in Integrations.jsx**
`const isDemo = false` hardcoded, threaded through all sub-components as a prop. Functionally harmless (always false) but conceptually wrong post-demo-removal.
**Fix:** Remove isDemo from Integrations entirely.

**IC-08: Portal.jsx — calendarTier prop not passed to CalendarTab**
`case 'calendar': return <CalendarTab onNavigate={handleNavigate} prefill={...} .../>` — no calendarTier prop passed despite CalendarTab declaring it in its signature.
**Fix:** Pass `calendarTier={calendarTier}` once Portal reads it.

**IC-09: ActivityDashboard tier default 'standard' vs 'light' everywhere else**
`setTier(tenant.subscription_tier || 'standard')` — all other files default to 'light'.
**Fix:** Change to 'light'.

**IC-10: Listen tier values not normalised**
Values in use: 'none', 'standard', 'premium', 'advanced'. PlanSelector uses 'standard'+'advanced'. DB has 'none', 'standard', 'premium'. No canonical enum.
**Fix:** Decide canonical values. Recommend: 'none' | 'standard'. Migrate 'premium'/'advanced' → 'standard'.

**IC-11: Unused state variables — AIBehaviour.jsx**
`greetingModalShown`, `showProtectedModal`, `generateGreeting`, `currentMode`, `isEnterprise`, `generatingGreeting`, `numberSaving`, `setGeneratorNotes` — all declared, never used.
**Fix:** Remove all.

**IC-12: Unused state/props in Portal.jsx**
`isOwner`, `allTenants`, `setAllTenants`, `triageMode`, `tabs` (computed but never used).
**Fix:** Remove all.

**IC-13: `{false && ...}` dead block in Portal.jsx:644**
Holiday widget wrapped in `{false && ...}` — permanently dead.
**Fix:** Delete the block.

**IC-14: OwnerSelector imports supabase + usePreview but never uses either**
ESLint confirms both are unused.
**Fix:** Remove both imports.

**IC-15: PhoneLines.jsx — tenantId and isPreview defined but never used**
Phone line data likely needs tenant context — this is probably a missing wiring, not intentional.
**Fix:** Investigate whether PhoneLines needs tenant scoping; if so, wire it.

### Minor (lint / performance)

**IC-16: Multiple setState-in-effect violations**
HelpMascot (×3), AIBehaviour, AccountSettings (×1), PlanSelector, StaffDirectory, Onboarding.
These cause cascading renders but don't break functionality.
**Fix:** Batch into useLayoutEffect or restructure — low priority unless performance issues arise.

**IC-17: Missing useEffect dependencies**
Multiple files (AIBehaviour, PartnersReferrals, StaffDirectory, OwnerSelector, OwnerAudit, PlanSelector, Onboarding).
Usually intentional (avoid re-run on navigate ref change) but should be reviewed.

**IC-18: AuthContext + PreviewContext fast-refresh warnings**
Both export non-component values alongside components. Minor dev-experience issue.

---

## 8. NAVIGATION ARCHITECTURE — CURRENT vs INTENDED

### Current (Portal.jsx):
```
PRODUCTS array:
  Answer → [dashboard, analytics, ai, referrals]
  Listen → [listen]    (locked if !hasListen)
  Schedule → [calendar, team (locked if !hasScheduleMulti)]
  _build_card → upsell card
  Platform → [profile, integrations, lines]
```
**Problem:** No gating on whether Schedule product is purchased. Always shown.

### Intended (CLAUDE.md + Philip's vision):
```
Answer only:
  ANSWER → [Dashboard, AI Settings, Analytics, Partners]
  Platform → [Integrations, Business Profile, Account & Billing]

Answer + Listen:
  ANSWER → [Dashboard, AI Settings, Analytics, Partners]
  LISTEN → [Listen]
  Platform → [...]

Answer + Schedule:
  ANSWER → [Dashboard, AI Settings, Analytics, Partners]
  SCHEDULE → [Calendar, Team]
  Platform → [...]

Schedule only:
  SCHEDULE → [Calendar, Team, Services, Analytics, Partners]
  Platform → [... Account shows Answer as upsell]
```

**Key gap:** The "Schedule only" experience (dazzle nav) is not yet built.

---

## 9. KEY RULES — NEVER VIOLATE

- All styles inline. No CSS files. No CSS variables. Ever.
- Supabase: anon key in frontend only, service role in API only.
- HS256 anon key only — never use sb_publishable_ (ES256).
- Save guard on every mutation: `if (isPreview || !tenantId) return`
- Tier checks use the canonical pattern (§2).
- PowerShell does not support `&&` — two separate commands.
- Vercel deploy: `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod`
- API function limit: 12/12 — AT CAPACITY. No new API files without consolidating first.
- Vera speeches use `context_key` column (not `speech_key`).
- `.maybeSingle()` not `.single()` — prevents 406 on 0 rows.

---

## 10. WHAT'S BUILT vs WHAT'S NEXT

### Built and working:
- Full auth flow (signup → onboarding → portal)
- All 11 portal tabs (dashboard, ai, analytics, referrals, listen, calendar, team, profile, integrations, lines, settings)
- Vapi call handling end-to-end (webhook → call_log → lead → notification)
- Owner preview mode (/owner/select → preview any tenant)
- AI prompt builder (layers 1-3, catalogue matching)
- Vera mascot (hover mode, zone mode, Haiku dialogue)
- Email pipeline (daily cost, weekly summary, appointment reminders)
- Integrations framework (Google Calendar/CalDAV, WhatsApp, FreeAgent, Xero, Zapier, review platforms)
- Booking page (/book/:tenantId) for customer self-booking
- 15 real sample tenants seeded (all tiers + product combinations)

### Immediate next (agreed):
1. Fix IC-01, IC-02, IC-03, IC-04 — correct product gating in Portal + Calendar
2. Build calendar viewport feature (Open/Compact toggle, configurable staff+day count, arrow nav, drag-reorder staff, Today button) in CalendarSettingsTab
3. Sidebar nav rebuild (product-grouped, Schedule-only dazzle nav)

### Pending decisions:
- Confirm "Schedule" as final product name (currently Calendar in code)
- Confirm Listen pricing (£10/mo + 3-4p/min)
- Confirm new tier names/prices
- Vera's name confirmation
- Stripe, FreeAgent, Xero OAuth setup (user actions)

---
*Last updated: 2026-06-11*
