# QERXEL — COMPLETE PROJECT HANDOFF V13
## Read this at the start of every new conversation thread.
## Last updated: 2026-06-06 (session 11 — portal redesign sprint)

---

## WHAT QERXEL IS

AI call handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers out-of-scope callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

Working name. Not legally confirmed yet.
Core sales framing — LOCKED: **"Never miss another lead."**
Scale intent: 500 tenants before any tech hires. All development via Claude Code.

---

## FOUNDER

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator. Uses Claude Code (VSCode extension) for all development.

Dev environment: **Windows 11, VSCode, PowerShell.** F12 hijacked by ASUS — uses Ctrl+Shift+I. **PowerShell does not support `&&` — always two separate commands.**

---

## CLVS WORKING PROTOCOL — IN EFFECT

ClWeb = Claude web (strategy, design, research, decisions)
ClVS = Claude VS Code (execution, code, implementation)

**Build discipline:**
- Execute one task at a time. Confirm each task passes quality check before starting next.
- Never run parallel tasks. Never skip ahead in the sequence.
- Update QERXEL-HANDOFF.md after every significant build and push to GitHub.

**Challenge protocol:**
- Flag any instruction conflicting with strong technical or design consensus. One sentence. Then implement as instructed unless told otherwise.

**Quality check — before reporting any task complete:**
1. Can a new user understand the dashboard story within 3 seconds of landing?
2. Is the colour coding system applied consistently across the entire component?
3. Does the visual quality match Stripe, Linear, or Vercel at portal level?
All three must pass. Self-correct first if any fail.

**Autonomy instruction (from design brief):**
Proceed without waiting for founder approval on any decision covered in the brief.
The brief is the authority. Stop only for: broken functionality, database schema changes not in handoff, or a decision that would require reversing completed work.

**Market research critique:**
Do not self-initiate. Only when ClWeb instructs. Deliver here in ClVS. ClWeb reads, analyses, discusses with founder, sends updated instructions back.
First critique point: after Task J (full implementation complete).

---

## TIER STRUCTURE

| Tier | Price | Concurrent | Minutes/mo |
|------|-------|-----------|------------|
| Free | £0 (PAYG £0.35/min) | 1 | 0 (PAYG) |
| Light | £29/month | 1 | 120 |
| Standard | £49/month | 1 | 250 |
| Professional | £69/month | 2 | 450 |
| Enterprise | £249/month | 3+ | 1,000 |
| Bespoke | Contact us | Custom | Custom |

Overage: Premium voice £0.18/min · Standard voice £0.14/min. PAYG flat £0.35/min.
Enterprise has NO referral network cap.

**Tier checks in code — always use this pattern:**
```javascript
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

---

## TECH STACK

| Component | Technology |
|-----------|------------|
| Telephony | Vapi (BYOK pricing) |
| STT | Deepgram Nova-2 |
| LLM | Gemini Flash (Standard) / GPT-4o mini (Premium) |
| TTS | Cartesia Sonic 3 (Standard) / Cartesia Sonic 3.5 (Premium) |
| Database | Supabase (PostgreSQL) |
| Frontend | React/Vite → Vercel (auto-deploys on push to master) |
| SMS | Twilio |
| Email | Resend |
| Payments | Stripe (wired, needs env var setup) |
| Calendar | react-big-calendar + date-fns |
| Vera AI | Claude Haiku (vera-chat, greeting-generator, support-chat, scrape-website) |

Supabase: https://kkrsvkxkefijmtbwykzv.supabase.co
Anon key (HS256 — use this, NOT sb_publishable_): in `src/supabase.js`
GitHub: https://github.com/philsk1/qerxel-portal
Live URL: https://qerxel-portal.vercel.app

**RLS:** Enabled on all production tables. HS256 anon key works with `auth.uid()`.
**NEVER switch to ES256 `sb_publishable_` key.**
Vapi webhook + owner-tenants.js use service_role key (bypass RLS). Correct.

---

## VISUAL LANGUAGE — LOCKED

All inline styles. **No CSS files. No CSS variables. Ever.**

### Colour token set (complete — from design brief)

| Token | Value |
|-------|-------|
| --violet | #5e3b87 |
| --violet-dark | #4a2d6e |
| --violet-deep | #3a2057 |
| --violet-soft | #f0ebf8 |
| --amber | #f0a500 |
| --amber-dark | #b07a00 |
| --amber-soft | #fef3d9 |
| --green | #3db87a |
| --green-soft | #e6f5ee |
| --red | #ef4444 |
| --red-soft | #fdecea |
| --blue | #3b82f6 |
| --blue-soft | #eff6ff |
| --slate | #64748b |
| --slate-soft | #f8fafc |
| --bg-page | #f7f6f9 |
| --bg-card | #ffffff |
| --border-card | rgba(94,59,135,0.08) |
| --text-primary | #1a1a1a |
| --text-secondary | #666666 |
| --text-tertiary | #aaaaaa |
| --divider | #e0d8ed |
| --shadow-card | 0 2px 12px rgba(94,59,135,0.06) |
| --shadow-card-hover | 0 8px 24px rgba(94,59,135,0.12) |
| --shadow-modal | 0 20px 60px rgba(0,0,0,0.15) |

**Colour usage rules:**
- Violet: navigation, primary actions, brand elements
- Amber: active states, CTAs, revenue, positive metrics
- Green: success, completed, healthy, positive trend
- Blue: information, neutral data, secondary metrics
- Red: urgent, warning, requires action, negative trend
- Slate: secondary text, labels, inactive states
- Soft companion token used for badge backgrounds and alert states
- Never use a primary colour as a background for large areas outside sidebar

### Outcome badge colours (CORRECTED — do not revert)
```javascript
booked:        { bg: '#f0ebf8', color: '#5e3b87' }   // violet
lead_captured: { bg: '#e6f5ee', color: '#1e7a4a' }   // green
referred_out:  { bg: '#eff6ff', color: '#1d4ed8' }   // blue
escalated:     { bg: '#fdecea', color: '#b91c1c' }   // red
filtered:      { bg: '#f8fafc', color: '#64748b' }   // slate
hard_close:    { bg: '#f8fafc', color: '#64748b' }   // slate
spam:          { bg: '#f8fafc', color: '#64748b' }   // slate
```

### Typography

| Use | Spec |
|-----|------|
| North star metric | Syne 700, 48px, --violet |
| Zone 1 stat numbers | Syne 700, 26px, colour by metric |
| Donut chart centre | Syne 700, 24px, --text-primary |
| Modal caller name | Syne 700, 20px, --text-primary |
| Logo | Syne 700, 18px, white |
| Card titles | DM Sans 600, 14px, --text-primary |
| Body text | DM Sans 400, 14px, --text-primary |
| AI summary in cards | DM Sans 400, 13px, --text-secondary |
| Labels / meta | DM Sans 400, 12px, --text-tertiary |
| Section headers | DM Sans 600, 11px, uppercase, letter-spacing 0.08em, --text-tertiary |
| Badge text | DM Sans 600, 11px, colour by outcome |
| Button text | DM Sans 500, 14px |

Line height: 1.5 body · 1.2 headings · 1.6 AI summaries

### Card specification (all cards)
```javascript
{
  background: '#ffffff',
  border: '0.5px solid rgba(94,59,135,0.08)',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(94,59,135,0.06)',
  padding: 20,
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
}
// Hover (clickable cards):
{ boxShadow: '0 8px 24px rgba(94,59,135,0.12)', transform: 'translateY(-2px)', cursor: 'pointer' }
// Urgent (escalated):
{ background: '#fdecea', borderLeft: '3px solid #ef4444' }  // no hover transform
```

### Buttons
- Primary: #f0a500 bg, #1a0533 text, borderRadius 8px, padding 10px 20px
- Disabled: #f5d98a bg, #7a5c1a text
- Secondary: white bg, #5e3b87 border 1px, #5e3b87 text, borderRadius 8px
- Destructive: transparent bg, #64748b text, no border, smaller font

### Logo
"Qerxel" Syne 700 + 7px amber dot (width/height 7, borderRadius 50%, background #f0a500, marginLeft 3, marginBottom 8)

---

## ANIMATION SPECIFICATION

**Entrance (all cards on load):**
- fadeInUp: opacity 0→1, translateY 12px→0
- duration: 0.3s, easing: cubic-bezier(0.16, 1, 0.3, 1)
- stagger: 0.05s between cards
- Order: Zone 1, Zone 2 left column, Zone 2 right column, Zone 3

**Count-up (north star + zone 3 percentages):**
- 0 to value over 0.6s on mount, ease-out

**Modal entrance:**
- Desktop: scale 0.95→1, opacity 0→1, 0.2s
- Mobile drawer: translateY 100%→0, 0.25s
- Overlay: opacity 0→1, 0.15s

**Urgent pulse (escalated lead dot):**
- Infinite, scale 1→1.4→1, opacity 1→0.4→1, 1.5s, red #ef4444

**Rules:**
- One animation per interaction maximum
- No animation on non-interactive elements after initial load
- Respect `prefers-reduced-motion` — disable all if set

---

## PORTAL STRUCTURE

### Shell layout (as built)
Full viewport flex row:
- Sidebar: 260px violet #5e3b87 (collapsible to 60px icon-only, 0.22s ease transition)
- Content: flex:1, overflow-y auto, padding 2rem

**Sidebar order (from design brief):**
1. Dashboard (grid icon) — default
2. Calendar (calendar icon)
3. AI Behaviour (sliders/mic icon)
4. Analytics (bar chart icon)
5. Partners & Referrals (users icon)
6. Integrations (link icon)
7. Business Profile (building icon) — kept despite not in brief (removing breaks functionality)
8. Account (person icon)

Active state: amber 3px left border, rgba(255,255,255,0.1) background
Hover state: rgba(255,255,255,0.05) background, 0.12s transition
Bottom of sidebar: user email, sign out, Vera owl (triggers help), collapse toggle

### 8 portal tabs
| Tab | File |
|-----|------|
| Dashboard | ActivityDashboard.jsx |
| Calendar | Calendar.jsx |
| AI Behaviour | AIBehaviour.jsx |
| Analytics | DataAnalytics.jsx |
| Partners & Referrals | PartnersReferrals.jsx |
| Integrations | Integrations.jsx |
| Business Profile | BusinessProfile.jsx |
| Account | AccountSettings.jsx |

**Save guard on all tabs:** `if (isDemo || isPreview || !tenantId) return`

---

## DASHBOARD — THREE ZONE LAYOUT (DESIGN BRIEF SPECIFICATION)

### Zone 1 — Engine and Control
One compact row. Tenant reads in under 2 seconds.

Contents (Task B will build full spec):
- Today's call count: Syne 700, 48px, violet — NORTH STAR METRIC (built in Task A as layout)
- AI status indicator: active/paused/overtime — green/amber/red
- Current voice tier badge: Standard or Premium
- Minutes arc gauge (not a number — arc gauge, colour shifts amber at 80%, red at 100%)
- Triage mode indicator: Strict/Balanced/Open
- Configure link top right → AI Behaviour tab

Zone 1 divider: full-width 1px #e0d8ed + "Today's Activity" label, DM Sans 600 11px uppercase #aaaaaa, left-aligned

### Zone 2 — Live Feed
Two equal columns, full height.

**Left — Recent calls feed:**
- Each call = a card (borderRadius 16, card spec above)
- Urgent (escalated): red-soft bg, red 3px left border, no hover transform
- Standard: white bg, violet 3px left border on hover only
- Filtered/spam: slate-soft bg, reduced opacity 0.6
- Card contents: caller name (DM Sans 600 14px), time (DM Sans 400 12px #aaa) top right, duration, outcome badge (colour system above), AI summary (DM Sans 400 13px #666, 2 lines max, ellipsis)
- Click anywhere → opens lead modal

**Right — Leads requiring action:**
- Only leads with status = 'new', ordered by urgency then created_at
- Same card dimensions as call cards
- Contents: caller name (DM Sans 600 14px), requirement (DM Sans 400 13px #666, 2 lines), time since call ("2 hours ago" not timestamp), estimated value if available (DM Sans 600 13px #f0a500), urgent pulsing red dot if escalated
- Action buttons: [Call back] amber primary, [WhatsApp] green (if connected), [View] violet secondary

Zone 2 divider: same style, label "Patterns"

### Zone 3 — Historical Snapshot
Three metric cards side by side (Task F — ApexCharts):

- Card 1: Lead capture rate donut chart, 120px, centre = percentage Syne 700 24px, vs last month with arrow + change %
- Card 2: Call volume spark bar chart, 7 bars, today highlighted violet, "Busiest day: X" below
- Card 3: Minutes trend line chart, 30 days, gradient fill violet→transparent, projected month-end usage below

Below cards: Recommendation card — full width, violet-soft #f0ebf8 bg, violet 4px left border, DM Sans 400 14px. Four states: actionable leads / minutes running low / no calls yet / healthy

---

## LEAD MODAL — FULL SPECIFICATION (Task E)

**Trigger:** click any call card, lead card, or View button
**Desktop:** centred overlay, 680px wide, max-height 80vh, scrollable internally
**Mobile:** slides up from bottom as full-height drawer (swipe down to close)
**Background:** rgba(0,0,0,0.4) overlay
**Close:** X button, click outside, or Escape
**Style:** borderRadius 20px, white bg, shadow 0 20px 60px rgba(0,0,0,0.15)

**Header (sticky):**
- Caller name: Syne 700 20px #1a1a1a
- Outcome badge
- Time + duration: DM Sans 400 13px #aaa
- X close button: 24px, #aaa, hover #1a1a1a

**Section 1 — Call Summary:**
- Label: DM Sans 600 11px uppercase #aaa
- Content: full ai_summary, DM Sans 400 14px #1a1a1a, line-height 1.6
- Background: #f0ebf8, borderRadius 12px, padding 16px

**Section 2 — Details captured:**
- Two column grid, label/value pairs
- Label: DM Sans 400 12px #aaa · Value: DM Sans 500 14px #1a1a1a
- Fields: caller name, phone number, requirement, urgency, callback requested

**Section 3 — Notes:**
- Editable textarea, DM Sans 400 14px, placeholder "Add a note..."
- Auto-saves on blur. "Saved" indicator briefly shown. No save button.
- Previous notes below: date, text, soft border-bottom separator

**Section 4 — History:**
- Only if caller has prior call_logs. Hidden if first contact.
- Previous calls: date, outcome badge, one-line summary. Click expands inline.

**Action row (sticky bottom, always visible):**
- White bg, top border 1px #e0d8ed, padding 16px
- [Mark as contacted] → amber primary (if status = new)
- [Book appointment] → amber primary (booking businesses)
- [Call back] → tel: link with caller number
- [WhatsApp] → pre-filled message (if integration active)
- [Invoice] → FreeAgent/Xero draft (if integration active)
- [Refer out] → referral partner selector
- [Dismiss lead] → inline confirmation (far right, slate, small)

---

## TASK SEQUENCE — CURRENT POSITION

### COMPLETED THIS SESSION

**Tasks 1 & 2 (Portal redesign):**
- [x] Task 1 — maxWidth: 940px removed from Portal.jsx content area. Full viewport.
- [x] index.css #root Vite boilerplate removed (was constraining to 1126px centred)
- [x] Task 2 — Left sidebar built. 260px violet. Collapsible to 60px. Logo top. Icons + labels. Amber 3px active border. Vera owl bottom as help trigger. User/sign-out bottom. Smooth 0.22s transition.
- [x] HelpMascot.jsx: id="vera-trigger-btn" added to owl div for sidebar trigger
- [x] Sidebar nav order updated to match brief (Dashboard → Calendar → AI → Analytics → Partners → Integrations → Business Profile → Account)

**Dashboard redesign Tasks A-J:**
- [x] Task A — Three-zone layout built in ActivityDashboard.jsx
  - Zone 1: compact status row (call count 48px, minutes bar, this month, leads, referrals, Configure→)
  - Zone 2: two-column (recent calls left, leads right)
  - Zone 3: recommendation + referrals today
  - Dividers with zone labels ("Today's Activity", "Patterns")
  - OUTCOME_BADGES colours corrected to full colour system
  - Card borderRadius updated to 16px, shadow applied
  - RecoCard updated: violet-soft bg, violet 4px left border

### REMAINING — EXECUTE IN ORDER

**Task B — Zone 1 status bar (AI-wired)**
Wire to real tenant data: AI active/paused/overtime status, voice tier badge (Standard/Premium from tenants.overage_voice_preference), minutes arc gauge (SVG arc, colour shifts amber 80%, red 100%), triage_mode indicator, today's call count (already built). Queries: tenants table for tier/triage_mode/billing_model/overage_voice_preference.

**Task C — Zone 2 call cards (redesign)**
Redesign call cards to full spec. Each call = card (not row). Card dimensions per spec. Outcome badge colour system. Urgent card style (red-soft bg, red left border, no hover transform). Filtered/spam: slate-soft, opacity 0.6. Hover state: translateY -2px, shadow deepen. Click → stub modal (real modal Task E). AI summary: 2 lines max, ellipsis.

**Task D — Zone 2 lead cards (redesign)**
Redesign lead cards to full spec. Time since call ("2 hours ago"). Urgent pulsing red dot on escalated leads. Action buttons: [Call back] (tel: link), [WhatsApp] (if connected), [View] (stub modal). Remove inline invoice/booking buttons from Zone 2 — those move to the modal.

**Task E — Lead modal (full build)**
Full modal to spec above. All 4 sections. Sticky header + sticky action row. Auto-save notes on blur. Mobile bottom drawer. Entrance/exit animations. Escape key close. Scroll position preserved on close. Wire to existing leads + call_logs + callers tables. notes → save to leads.notes column (or add if not exists — check schema first).

**Task F — Zone 3 historical snapshot (ApexCharts)**
```
npm install react-apexcharts apexcharts
```
Three metric cards: donut (lead capture rate), spark bar (call volume 7 days), line chart gradient (minutes 30 days). All use Qerxel colour palette. Count-up animation on percentages. Existing recommendation card stays. Zone 3 referrals section: keep or fold into sidebar if feels cluttered.

**Task G — Animation pass**
fadeInUp entrance on all cards, staggered 0.05s. Count-up on north star + zone 3 percentages (0→value, 0.6s, ease-out). Modal entrance/exit. Urgent pulse on red lead dots. All under 0.4s (except count-up). Respect `prefers-reduced-motion`.

**Task H — Mobile pass**
768px breakpoint: sidebar → bottom nav (5 items max: Dashboard, Calendar, AI, Analytics, Account + hamburger for rest). Cards single column. Zone 2 single column (calls first, leads below). Modal → bottom drawer, swipe down to close. Touch targets 44px minimum.

**Task I — Empty and error states**
Skeleton loading screens (shimmer, same card dimensions). Zone 2 empty: Vera owl 80px + "No calls yet today." / green checkmark + "You're all caught up." Inline error states (not full-page). "Couldn't load calls — tap to retry." Retry triggers re-fetch.

**Task J — Quality check and critique**
After Task I complete: stop building, conduct market research scan, write critique addressed to ClWeb covering all 5 criteria from protocol. Await ClWeb instruction before any further changes.

---

## KEY FILES

```
src/supabase.js                      — HS256 anon key
src/context/AuthContext.jsx          — Supabase auth session
src/context/DemoContext.jsx          — demo data provider
src/context/PreviewContext.jsx       — owner preview mode
src/App.jsx                          — routes
src/pages/Portal.jsx                 — shell, sidebar, 8-tab routing (REWRITTEN THIS SESSION)
src/pages/ActivityDashboard.jsx      — dashboard (3-zone layout BUILT THIS SESSION)
src/pages/BusinessProfile.jsx
src/pages/AIBehaviour.jsx
src/pages/DataAnalytics.jsx
src/pages/PartnersReferrals.jsx
src/pages/AccountSettings.jsx
src/pages/Calendar.jsx               — standalone calendar product
src/pages/Integrations.jsx           — module framework (9 live integrations)
src/pages/Onboarding.jsx             — 8-step onboarding
src/components/HelpMascot.jsx        — Vera owl (id="vera-trigger-btn" added this session)
src/components/VeraDialogue.jsx      — draggable Claude Haiku chat panel
src/components/DemoBanner.jsx        — demo amber banner + tier switcher
api/vapi-webhook.js                  — end-of-call handler (service role)
api/vapi-sync.js                     — patches Vapi assistant on AI Behaviour save
api/_build-prompt.js                 — system prompt builder (Layer 1–3, NEVER modify Layer 1)
api/vera-chat.js                     — Vera dialogue (Claude Haiku)
api/support-chat.js                  — Account tab support chat
api/stripe-checkout.js               — Stripe Checkout session
api/stripe-webhook.js                — Stripe event handler
api/remind-appointments.js           — hourly cron, appointment reminders
supabase_rls.sql                     — idempotent RLS script
supabase_migrations_session4.sql     — pending: Calendar + Stripe + DID columns
supabase_migrations_integrations.sql — pending: tenant_integrations + credentials
demo_seed.sql                        — demo data seed (safe to re-run)
```

---

## DATABASE — KEY FACTS

**Production tables (RLS enabled):** tenants, profiles, tenant_memberships, call_logs, leads, referral_log, referral_partners, services, staff_profiles, appointments, minute_usage, vera_speeches, vera_seen, tenant_credits, and more.

**Demo tables (no RLS — public read):** demo_businesses, demo_call_logs, demo_leads, demo_referral_log, demo_services, demo_staff, demo_partners, demo_users, demo_sessions

**Key tenants columns:**
tier, billing_model, overage_voice_preference (premium|standard), triage_mode, monthly_cost_limit, stripe_customer_id, stripe_subscription_id, vapi_assistant_id, data_retention_days, call_recording_enabled

**leads table notes columns:** Check if `notes` column exists before Task E. If not, add: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;`

**Pending migrations (not yet run in Supabase SQL Editor):**
- supabase_migrations_session4.sql (Calendar, Stripe, DID)
- supabase_migrations_integrations.sql (tenant_integrations, tenant_integration_credentials)

---

## CODE CONVENTIONS

- `.maybeSingle()` not `.single()` — prevents 406 on 0 rows
- All Supabase queries: try/catch with finally { setLoading(false) }
- Tier checks: `isEnterprise = ['enterprise','bespoke'].includes(tier)`
- Save guard: `if (isDemo || isPreview || !tenantId) return` — on every mutation
- Demo pattern: `const demo = useDemo(); const isDemo = !!demo?.isDemo`
- No CSS files — all inline styles
- data-help on all section headings and key UI elements
- Supabase anon key safe in frontend. Service role key NEVER in frontend.
- Demo tables prefixed demo_. Never join to production tables.
- Appointments belong to staff_profile_id not tenant_id — do not change this.
- Calendar is standalone — never conditionally render based on AI call handling.
- Integrations: each is self-contained in INTEGRATIONS array. Add status + handler, never touch the framework.

---

## WHAT DOES NOT CHANGE — EVER

- Inline styles convention — no CSS files, no CSS variables
- Vera mascot system — HelpMascot.jsx, VeraDialogue.jsx, vera_speeches
- All data-help attributes
- Auth guards and onboarding flow
- All API endpoints
- All database schema (additions only, never removals)
- "Please allow me" through-line in all AI prompts
- Layer 1 prompt constants in _build-prompt.js (LAYER_1_CORE_VALUES, LAYER_1_JUDGEMENT)
- Warmth floor — no tenant instruction makes the AI cold or robotic

---

## DEMO SYSTEM

Flow: `/demo/login` → `/demo/select` → `/demo/tier/:id` → `/demo/portal/:id/:tier`
Side route: `/demo/performance`
Login: demo@qerxel.app / QERXEL2026
DemoContext shapes all data for all tabs. DemoPortal uses same tab components as Portal.
All saves guard: `if (isDemo || isPreview || !tenantId) return`

**10 demo businesses:**
- Bella's Hair Studio (standard), Fast Flow Plumbing (professional), Bright Spark Electrical (light), Green Thumb Gardens (standard), Pawfect Grooming (light), Peak Performance PT (standard), Clarity Accounting (professional), Spotless Cleaning Co (standard), Fresh Coat Decorating (light), Restore Physiotherapy (enterprise)

---

## 9 LIVE INTEGRATIONS

WhatsApp Business, Google Calendar (CalDAV), Google Business Profile, FreeAgent (OAuth), Xero (OAuth), Stripe Payments (payment links), Checkatrade (review requests), Rated People (review requests), Zapier (outbound webhook on lead_captured)

---

## OWNER PREVIEW MODE

is_owner email: finsolsoffice@gmail.com
profiles.is_owner = true for this email.
Owner dropdown in sidebar (when not collapsed) — lists all tenants.
Selecting a tenant enters preview via PreviewContext — amber banner, all saves blocked.

---

## PRACTICAL NOTES

- Dev server: `cd C:\Users\philo\verrante-portal` then `npm run dev`
- Runs on http://localhost:5173
- PowerShell: no && — always two separate commands or use Bash tool
- F12 hijacked — use Ctrl+Shift+I
- Vercel: auto-deploys on push to master
- Hot reload active

---

*Handoff V13 — June 2026*
*Written by ClVS at end of session 11 (portal redesign sprint)*
*Next: Task B (Zone 1 AI status bar) → Tasks C through J in sequence*
