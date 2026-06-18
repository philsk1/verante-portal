# Frontend Structure and Routing

## Overview

The frontend is a React 18 application built with Vite. All pages are in `src/pages/`. All shared components are in `src/components/`. There is no React Router — navigation is handled via a tab/state system inside `Portal.jsx`.

**Entry point:** `src/main.jsx` → renders `App.jsx` → which renders the appropriate page based on auth state and URL.

**Public routes (no auth):**
- `/` — landing page or redirect to `/portal` if logged in
- `/signup` — auth page (login + register)
- `/onboarding` — new tenant setup wizard (requires auth, no tenant yet)
- `/book/:tenantId` — public booking page (no auth, customer-facing)
- `/manage-booking/:token` — customer self-management (cancel/reschedule)
- `/owner/select` — owner selector (requires auth + owner email)

**Protected routes (auth required):**
- `/portal` — the main application shell

---

## Portal.jsx — the main shell

`Portal.jsx` is the root component that most authenticated users spend all their time in. It:

1. Reads `tenant_memberships` to find the user's `tenant_id`
2. Reads the full `tenants` row to get subscription tiers and config
3. Derives product flags (`hasSchedule`, `hasAnswerProduct`, `hasListen`, etc.)
4. Reads URL params to detect owner preview mode
5. Renders `PortalSidebar.jsx` on the left
6. Renders the active tab component on the right
7. Wraps everything in `QScoreContext.Provider`

**Tab routing:** Tab state is stored in `localStorage` under `qerxel_last_tab`. When a tab is selected in the sidebar, Portal.jsx updates this key and renders the matching component. On reload, the last active tab is restored.

**Owner preview:** If URL contains `?ownerPreview=<tenantId>&ownerName=<name>`, Portal.jsx calls `enterPreview()` from `PreviewContext` and clears the URL params. The banner component is rendered at the top of the portal showing the preview tenant's name and the edit/read-only toggle.

---

## Page components — complete list

| Component file | Tab name | What it does |
|---------------|----------|-------------|
| `ActivityDashboard.jsx` | Dashboard | Home screen: readiness checklist, recent calls, Q score overview, quick actions |
| `BusinessProfile.jsx` | Business Profile | Business name, hours, context, contact name, booking link, business email, phone |
| `AIBehaviour.jsx` | AI Behaviour | ALL AI settings: triage, tone, call type rules, speech, escalation, messaging, blocked numbers, demo call |
| `ServiceCatalogue.jsx` | Services | Catalogue items — name, description, price range, duration, processing time, supplier link |
| `BusinessTab.jsx` | Business | Business desk: team, services quick-ref, suppliers, phone book, partners |
| `StaffDirectory.jsx` | Team | Staff profiles, availability, specialisms, direct lines |
| `Calendar.jsx` | Calendar | Appointment calendar — day/week/month/column views, create/edit appointments |
| `CalendarIntelligence.jsx` | Schedule Intelligence | Booking analytics — busiest periods, popular services, staff utilisation |
| `ClientDirectory.jsx` | Contacts | Merged view of callers (from calls) and booking clients (from appointments) |
| `ListenTab.jsx` | Listen | Call log with transcripts, outcomes, AI summaries; live desk |
| `DataAnalytics.jsx` | Analytics | Q Intelligence: outcome breakdown, revenue evaporation, segments, fragility |
| `Integrations.jsx` | Integrations | WhatsApp, Zapier, FreeAgent, Xero, Google Calendar, reviews |
| `PhoneLines.jsx` | Phone Lines | Vapi phone number display, call forwarding instructions, spam settings |
| `PartnersReferrals.jsx` | Partners | Referral partner directory and service mapping |
| `ProductCatalogue.jsx` | Products | Products (distinct from services — physical items for sale) |
| `AccountSettings.jsx` | Account | Billing, branding, notifications, data retention, GDPR export |
| `PlanSelector.jsx` | Plans | Tier selection and upgrade (blocked on Stripe) |
| `Sentry.jsx` | Sentry | Zone reconciliation: camera zones, variance detection, weekly digest |
| `OwnerAudit.jsx` | Audit | Owner-only: system-wide audit view |

---

## Shared components

### `PortalSidebar.jsx`
Left navigation sidebar. Reads product flags from Portal.jsx to show/hide nav sections:
- **Answer section** — AI Behaviour, Call Handling, etc. (hidden if schedule_only)
- **Schedule section** — Calendar, Team, Services, Booking page
- **Listen section** — Call Log, Live Desk
- **Intelligence section** — Analytics, Sentry
- **Account section** — Integrations, Settings, Plans

Features:
- Collapsible sections (state in `localStorage qerxel_sb_sections`)
- Pinned tabs (state in `localStorage qerxel_sb_pins`)
- Health check warning (dismissable, 30-day decay, `qerxel_health_dismissed`)
- Answer upsell strip for schedule_only tenants
- Upsell modal for locked features

### `HelpMascot.jsx`
The Q mascot displayed in the corner of each portal page. Shows:
- Q's SVG image (4 moods: happy, satisfied, concerned, unhappy)
- Q's speech bubble with context-relevant coaching
- Dialogue coaching panel (shows coachingPoints from QScoreContext)
- Dismiss button ("I'm happy with this") → saves dismissal timestamp to `q_dismissals` via Supabase

**SVG images:** Stored in `public/qmood/` directory. Philip places files here manually. Claude verifies dimensions with `ls` but never writes image content.

Four mood files: `happy.svg`, `satisfied.svg`, `concerned.svg`, `unhappy.svg`. Two sizes per mood: standard and small.

**Mood selection:** Based on QScoreContext's `globalMood` (or page-specific pillar). See QScoreContext for mood → pillar mapping.

### `VeraDialogue.jsx`
The in-portal AI support chatbot — Q talking to the user about how to use their portal. Uses Claude Haiku via `/api/chat`. Reads KB articles for context (RAG, planned — currently uses direct KB file loading). Shown as a slide-out panel from the HelpMascot component.

---

## Context providers

### `AuthContext.jsx`
Provides: `user` (Supabase auth user object), `session`, `signOut()`.
Wraps the entire app. All components can call `useAuth()` to get the current user.

### `PreviewContext.jsx`
Provides owner preview state:
- `isPreview: bool` — true when viewing any tenant as owner
- `previewTenantId: string` — the tenant being previewed
- `previewBusinessName: string` — for the banner
- `previewEditable: bool` — true when in Edit mode (owner making changes)
- `previewReadOnly: bool` — true when in Read-only mode (browsing only)
- `enterPreview(tenantId, businessName)` — activates preview
- `exitPreview()` — clears preview state
- `tierOverride: object` — lets owner simulate different tiers for a tenant

**Save guard pattern (used in every mutation):**
```js
if (isPreview || !tenantId) return  // previewReadOnly also blocks saves
```

### `QScoreContext.jsx`
Loaded once per portal session. Provides:
- `globalScore: number` — overall weighted score (0-100)
- `globalMood: string` — 'happy'|'satisfied'|'concerned'|'unhappy'
- `globalCaption: string` — mood description text
- `qMode: string` — tenant's QMood mode ('very_helpful'|'jump_in'|'mind_own_business')
- `configPillar: number` — AI configuration completeness score
- `toolPillar: number` — integrations score
- `perfPillar: number` — call performance score
- `coachingPoints: array` — up to 5 specific issues, sorted by severity
- `qDismissals: object` — timestamps of dismissed coaching items per page key
- `saveDismissal(pageKey)` — saves dismissal to `tenants.q_dismissals` via Supabase
- `refresh()` — recalculates scores from current DB state

**Schedule-only suppression:** If `subscription_tier === 'schedule_only'`, `coachingPoints = []`. Answer coaching is completely suppressed.

---

## Local storage keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `qerxel_last_tab` | `Portal.jsx` | Active tab name — restored on reload |
| `qerxel_sb_sections` | `PortalSidebar.jsx` | Sidebar section open/closed state (JSON map) |
| `qerxel_sb_pins` | `PortalSidebar.jsx` | Set of pinned tab names |
| `qerxel_last_preview` | `OwnerSelector.jsx` | Last previewed tenant ID |
| `qerxel_health_dismissed` | `PortalSidebar.jsx` | Health check dismissal timestamp (30-day decay) |

---

## Product flags — how gating works

Derived in `Portal.jsx` from the tenant's `tenants` row:

```js
const hasSchedule      = calendarTier !== 'none'
const hasScheduleMulti = calendarTier === 'multi'
const hasListen        = listenTier !== 'none'
const hasAnswerProduct = !!subscriptionTier && subscriptionTier !== 'schedule_only'
const hasSentry        = sentry_camera_limit > 0

// Branding gate
const hasBranding = hasAnswerProduct || calendarTier === 'multi'

// Discovery card gate (booking page)
const isProfPlus = ['professional', 'enterprise', 'bespoke'].includes(subscription_tier)
const showDiscoveryCard = !(isProfPlus && tenant?.hide_qerxel_ad)
// Note: booking page footer attribution always shows, regardless
```

These flags are passed as props or read from context in child components. Components never query `subscription_tier` directly to make gating decisions — they use the derived flags.

---

## Onboarding flow (Onboarding.jsx)

Multi-step wizard run by new tenants after signup:

```
Step 0: Website URL entry → Firecrawl scrape → Claude Haiku extracts name/services
Step 1: Business name confirmation
Step 2: Business type selection
Step 3: Service list review
Step 4: AI preferences (tone, triage mode)
Step 5: Plan selection
Step 6: Completion → fires vapi-sync to create Vapi assistant → redirect to /portal
```

On completion, `tenants` row exists with `vapi_assistant_id` set. The phone number is assigned separately by Philip.

---

## Booking page (BookingPage.jsx — public route)

Public customer-facing page at `/book/:tenantId`. No authentication. Reads:
- `tenants` (business name, branding, booking settings)
- `catalogue_items` (active services with duration)
- `staff_profiles` and `staff_availability` (for slot generation)

Five-step flow:
1. Service selection (with fuzzy search if >4 services)
2. Date selection
3. Time slot selection (generated from availability, buffer applied, conflicts checked)
4. Customer details (name, phone, email, notes)
5. Confirmation → creates appointment → sends confirmation email with cancel_token link → shows discovery card (gated by tier)

**Slot generation logic:** For each date, the system iterates through staff availability hours in 15-minute increments, checks for existing appointment conflicts, applies the booking buffer, and returns available slots. If `processing_minutes` is set for a service, adjacent slots are also blocked.
