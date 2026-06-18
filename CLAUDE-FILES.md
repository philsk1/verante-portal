# QERXEL — FILE MAP
## Every source file, its role, and what it touches

---

## Routes

| Path | Component | Auth | Notes |
|------|-----------|------|-------|
| `/login` | Login.jsx | public | |
| `/signup` | Signup.jsx | public | |
| `/onboarding` | Onboarding.jsx | protected | 6-step wizard, creates tenants + tenant_memberships |
| `/portal` | Portal.jsx | protected | Main shell, all tab routing |
| `/owner/select` | OwnerSelector.jsx | owner only | Lists all tenants with Q scores |
| `/owner/audit` | OwnerAudit.jsx | owner only | |
| `/plans` | PlanSelector.jsx | protected | Product + tier selection |
| `/book/:tenantId` | BookingPage.jsx | public | Customer online booking, manage booking, AI advisor widget |
| `/manage-booking/:token` | ManageBooking.jsx | public | Cancel/view by cancel_token |
| `/try-q` | SalesChat.jsx | public | Public Q Chat — sales triage agent, "Hear Q live" outbound demo call, "Explore the portal" ephemeral demo build + sign-in |

---

## Portal shell files

| File | Role |
|------|------|
| `src/pages/Portal.jsx` | Main shell — sidebar, tab routing, preview banner, mobile nav. Delegates state to useTenantState. |
| `src/pages/PortalIcons.jsx` | 20 named SVG icon components |
| `src/hooks/useTenantState.js` | 17 tenant state vars + parallel Promise.all init + saveReturnDate/saveNotification |

---

## Tab files

| File | Tab ID | Product | Notes |
|------|--------|---------|-------|
| `ActivityDashboard.jsx` | dashboard | Answer | Zone 1/2/3 layout, reads listen+calendar tier locally |
| `AIBehaviour.jsx` | ai | Answer | Vapi config, prompt builder, tone/triage, AI Foundation tab |
| `DataAnalytics.jsx` | analytics | Answer | Charts, enterprise competitive intel (gated) |
| `ScheduleAnalytics.jsx` | analytics | Schedule | Booking KPIs, weekly trend, by service, by staff — shown for schedule_only |
| `PartnersReferrals.jsx` | referrals | Answer | Partner management, referral network |
| `ListenTab.jsx` | listen | Listen | Transcript archive, copilot mode |
| `Calendar.jsx` | calendar | Schedule | react-big-calendar, DnD, team mode, appointment modal |
| `CalendarIntelligence.jsx` | (sub) | Schedule | Intelligence Hub panel inside Calendar |
| `StaffDirectory.jsx` | team | Schedule | Staff cards, slide-in panel, tag picker |
| `BusinessProfile.jsx` | profile | Platform | Business config + 4 nav tiles (Clients/Services/Products/Team) |
| `ClientDirectory.jsx` | clients | Business | Searchable client list, hot prospects, opt-out, campaigns |
| `ServiceCatalogue.jsx` | services | Business | Services, notes, tier-gated quota |
| `ProductCatalogue.jsx` | products | Business | Products, SKU, notes, tier-gated quota |
| `Integrations.jsx` | integrations | Platform | Integration modules |
| `AccountSettings.jsx` | settings | Platform | Billing, plan, booking page config, Q mode, GDPR, support chat |
| `PhoneLines.jsx` | lines | Platform | Phone line management |
| `Sentry.jsx` | sentry | Sentry | Zone canvas editor, variance dashboard, Q wizard |
| `AIFoundation.jsx` | (sub) | Answer | Annotated read-only view of guardrails + computed AI config — rendered inside AIBehaviour |
| `BusinessTab.jsx` | business | Business | Business Desk — team cards, services/products with supplier picker, suppliers CRUD, phone book |
| `SupportIntelligence.jsx` | support | Owner only | Support call log, incident management, 10x compensation calculator, policy editor. Gate: finsolsoffice@gmail.com only |
| `MasterControl.jsx` | command | Owner only | System state, Q write authority, per-element status, warden snapshot, Meaning Map, live signal feed. Gate: finsolsoffice@gmail.com only |

---

## Components

| File | Role |
|------|------|
| `HelpMascot.jsx` | Q mascot — per-page mood, decay logic, coaching panel, "I'm happy" dismissal. Q PNG sizes: 136px (main), 124px (tooltip), 54px (coaching header) |
| `MoodQ.jsx` | Inline mood icon used in AIBehaviour and ActivityDashboard — accepts mood/reason/tip/size props |
| `VeraDialogue.jsx` | Draggable Claude Haiku chat panel |
| `ProtectedRoute.jsx` | Auth redirect guard |
| `QBotIcon.jsx` | SVG icon |
| `ErrorBoundary.jsx` | Global class-based error boundary — wraps entire app in main.jsx, shows branded reload screen on unhandled throws |

---

## Contexts

| File | Provides |
|------|---------|
| `src/context/AuthContext.jsx` | user, session, signOut |
| `src/context/PreviewContext.jsx` | isPreview, previewTenantId, previewBusinessName, previewEditable, previewReadOnly, enterPreview, exitPreview, tierOverride |
| `src/context/QScoreContext.jsx` | globalScore, globalMood, globalCaption, qMode, configPillar, toolPillar, perfPillar, coachingPoints, qDismissals, saveDismissal(pageKey), refresh() |

---

## Hooks

| File | Role |
|------|------|
| `src/hooks/useTenantState.js` | Tenant state management for Portal |

Note: `useQScore` that is actually used is exported from `QScoreContext.jsx` — not a separate file.

---

## API underscore helpers (do not count toward Vercel 12-file slot limit)

| File | Role |
|------|------|
| `api/_build-prompt.js` | buildGreeting(), system prompt builder — used by both vapi endpoints |
| `api/_elements.js` | Element registry (Answer/Support/Q/Schedule/Listen) + SIGNAL_TYPES enum |
| `api/_emails.js` | Resend email sender |
| `api/_kb.js` | `ragSearch(query, n)` + `formatChunks(chunks)` — Postgres FTS search on kb_chunks table, injected into handleVera |
| `api/_master.js` | `getMasterConfig()`, `isQWriteEnabled()`, `isElementActive()` — read-only master config |
| `api/_ratelimit.js` | `checkRateLimit(ip, key, max, windowMs)` + `getClientIP(req)` — in-memory per-instance rate limiter. Used by chat.js (sales/demo-build) and vapi-sync.js (sales-demo). Replace with Upstash Redis at scale. |
| `api/_remind-appointments.js` | Appointment reminder logic |
| `api/_signals.js` | `emitSignal(element, type, payload)` — fire-and-forget to system_signals |
| `api/_sms.js` | Twilio SMS sender |
| `api/_whatsapp-send.js` | WhatsApp send via Twilio |
| `api/_zapier-webhook.js` | Zapier outbound webhook |

## Scripts

| File | Role |
|------|------|
| `scripts/index-kb.cjs` | Chunks all KB-*.md files by H2, indexes 285 chunks into kb_chunks via Supabase management API. Re-run after any KB file changes: `NODE_OPTIONS=--use-system-ca node scripts/index-kb.cjs` |
| `scripts/seed-landscape.mjs` | Demo tenant seeder |

---

## Q Mood PNGs

`public/qmood/smile.png` · `content.png` · `sad.png` · `crying.png`
Philip places these himself. Claude verifies with `ls` then deploys. Never write image content.

---

## Key file relationships

```
Portal.jsx
  ├── uses useTenantState.js (tenant state)
  ├── uses PortalSidebar.jsx (nav)
  ├── uses PortalIcons.jsx (icons)
  ├── wraps QScoreContext (Q score for all tabs)
  └── renders tab files based on activeTab

BookingPage.jsx (public, no auth)
  ├── reads tenants (branding, config, promo)
  ├── reads catalogue_items (services for step 1 — fuzzy search if >4)
  ├── reads staff_availability (via staff_profiles join)
  ├── writes appointments (step 5 confirm)
  └── calls /api/integrations (booking-confirm → email with cancel_token)

ManageBooking.jsx (public, token-based)
  ├── reads appointments by cancel_token
  └── updates appointments.status = 'cancelled'

QScoreContext.jsx (loaded once per portal session)
  ├── reads tenants (subscription_tier → hasAnswerProduct)
  ├── reads call_logs, staff_profiles, catalogue_items, staff_availability
  └── suppresses Answer coaching for schedule_only tenants
```
