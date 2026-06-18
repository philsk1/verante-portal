# QERXEL — ARCHITECTURE
## Portal structure, gating logic, data flows, owner system

---

## Portal shell

`Portal.jsx` — main shell. Reads `tenant_memberships` → `tenant_id`, then reads `tenants` row.
Derives product flags and renders sidebar nav. Tab switch renders tab component, which fetches its own data.

`useTenantState.js` — custom hook: 17 tenant state vars + parallel Promise.all init + `saveReturnDate`/`saveNotification` helpers.
`PortalIcons.jsx` — 20 named SVG icon components.
`PortalSidebar.jsx` — sidebar with collapsible sections, persistent open/close state, upsell modal, answer upsell strip for schedule-only.

### Portal product flags (derived in Portal.jsx)

```js
const hasSchedule      = calendarTier !== 'none'
const hasScheduleMulti = calendarTier === 'multi'
const hasListen        = listenTier !== 'none'
const hasAnswerProduct = !!subscriptionTier && subscriptionTier !== 'schedule_only'
```

### localStorage keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `qerxel_last_tab` | Portal.jsx | Active tab — restored on reload |
| `qerxel_sb_sections` | PortalSidebar.jsx | Section open/closed state (JSON map) |
| `qerxel_sb_pins` | PortalSidebar.jsx | Pinned tabs set |
| `qerxel_last_preview` | OwnerSelector.jsx | Last previewed tenant ID |
| `qerxel_health_dismissed` | PortalSidebar.jsx | Health check dismissal timestamp (30-day) |

---

## Gating logic

### Intent (product architecture)

```
subscription_tier = 'schedule_only' → Answer hidden entirely, Schedule nav active
calendar_tier = 'none'             → Schedule hidden
calendar_tier = 'entry'            → Basic calendar, team features locked
calendar_tier = 'multi'            → Full team calendar, Team tab unlocked
listen_tier = 'none'               → Listen hidden
listen_tier = 'standard'           → Listen visible
```

### Calendar branding gate

```js
// Booking page and AccountSettings
const hasBranding = hasAnswerProduct || calendarTier === 'multi'
// Free calendar only (schedule_only, no paid product) → no branding, Qerxel colours
```

### Qerxel ad gate (booking page)

```js
const isProfPlus = ['professional', 'enterprise', 'bespoke'].includes(subscription_tier)
const showDiscoveryCard = !(isProfPlus && tenant?.hide_qerxel_ad)
// "Booking service provided free by Qerxel business software" footer — always shown, non-negotiable
```

### Sentry gate

```js
const hasSentry = sentry_camera_limit > 0
// Always visible in sidebar (locked badge for non-subscribers)
// PIN gate: 4-digit optional PIN; owner preview always bypasses
```

---

## Data flows

### Inbound call

```
Phone call → Vapi → /api/vapi-assistant-request
  reads: tenants, staff_profiles, catalogue_items, referral_partners, referral_service_map
  returns: dynamic assistant config (voice, prompt, tools, keep_alive settings)
  call ends → /api/vapi-webhook
  writes: call_logs, leads, referral_log
  if escalated: SMS to business_phone + email to business_email
```

### Portal load

```
/portal → Portal.jsx
  reads tenant_memberships (user_id → tenant_id)
  reads tenants row (all product tiers, config)
  sets product flags → renders sidebar nav
  tab switch → tab component fetches its own Supabase data
  QScoreContext loads once per session: computes 3-pillar score + coaching points
```

### Online booking

```
/book/:tenantId → BookingPage.jsx (public)
  reads: tenants (config + branding), catalogue_items, staff_profiles, staff_availability
  step 1: service selection (fuzzy search if >4 services)
  step 2-3: date + slot (generates slots from availability, checks conflicts)
  step 4: customer details
  step 5: writes appointment → fires /api/integrations booking-confirm
           → sends confirmation email with cancel_token link
           → shows Qerxel discovery card (gated by tier/hide_qerxel_ad)
```

### Customer self-manage

```
/manage-booking/:token → ManageBooking.jsx (public)
  reads appointment by cancel_token
  can cancel (updates status = 'cancelled')
  reschedule button (future appointments only) → links to /book/:tenant_id
```

### Owner preview

```
/owner/select → OwnerSelector.jsx
  calls /api/admin (service role, finsolsoffice@gmail.com only)
  returns all tenants with Q scores
  click tenant → navigate /portal?ownerPreview=<id>&ownerName=<name>
  Portal.jsx reads params → enterPreview() → clears URL
  amber banner: "Owner preview · [name]" with Edit/Read-only toggle + exit/change buttons
  Edit mode: previewEditable = true → banner turns green → write guards use previewReadOnly (not isPreview)
  Read-only: previewReadOnly = true → all mutations return early
  Sentry PIN bypassed for owner preview
```

### Onboarding → tenant creation

```
/signup → /onboarding
  step 0: website scrape (Firecrawl + Claude Haiku)
  steps 1-6: business details, AI config, plan selection
  creates: tenants row, tenant_memberships row
  calendar_tier: 'entry' if Schedule purchased, 'none' if Answer-only
  → /portal
```

---

## Q Score system (QScoreContext.jsx)

Loaded once per portal session. Provides global score + per-page coaching.

Three pillars:
- `configPillar` — how complete the AI config is (ai page)
- `perfPillar` — call outcome quality, 50/50 blend all-time + last 10 days (dashboard/listen pages)
- `toolPillar` — integrations score (integrations page — hardcoded 100 until integrations built)
- `globalScore` — weighted average of all three

`coachingPoints` — top 5 Answer-specific issues, severity-sorted.
**Schedule-only tenants get `coachingPoints = []`** — Answer coaching is suppressed entirely.

Q mood per page: `ai → configPillar`, `dashboard/listen → perfPillar`, `integrations → toolPillar`, others → `globalScore`
Dismissal decay: "I'm happy" stores timestamp in `q_dismissals`; mood steps sadder by 1/month over 4 months; raw score always wins upward.

---

## Contexts

| File | Provides |
|------|---------|
| `AuthContext.jsx` | user, session, signOut |
| `PreviewContext.jsx` | isPreview, previewTenantId, previewBusinessName, previewEditable, previewReadOnly, enterPreview, exitPreview, tierOverride |
| `QScoreContext.jsx` | globalScore, globalMood, globalCaption, qMode, configPillar, toolPillar, perfPillar, coachingPoints, qDismissals, saveDismissal(pageKey), refresh() |

---

## API endpoints (12/12 — AT CAPACITY)

No new files until consolidation. Add to an existing endpoint.

| File | Route | Purpose |
|------|-------|---------|
| `api/admin.js` | /api/admin | Owner tenant list (service role) |
| `api/chat.js` | /api/chat | vera-chat + support-chat + booking-assist (Claude Haiku) |
| `api/export-data.js` | /api/export-data | GDPR CSV export |
| `api/freeagent-invoice.js` | /api/freeagent-invoice | FreeAgent invoice + Stripe checkout |
| `api/freeagent-oauth.js` | /api/freeagent-oauth | FreeAgent + Xero OAuth |
| `api/greeting-generator.js` | /api/greeting-generator | AI greeting generation |
| `api/integrations.js` | /api/integrations | WhatsApp, CalDAV, GBP, Zapier, send-welcome, review-request, booking-confirm |
| `api/notify.js` | /api/notify | Daily cost, weekly summary, reminders, SMS campaigns |
| `api/stripe-webhook.js` | /api/stripe-webhook | Stripe billing events |
| `api/vapi-assistant-request.js` | /api/vapi-assistant-request | Dynamic Vapi config per call |
| `api/vapi-sync.js` | /api/vapi-sync | Sync AI settings to Vapi on save |
| `api/vapi-webhook.js` | /api/vapi-webhook | End-of-call: write call_log, leads, referrals |
