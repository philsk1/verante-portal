# QERXEL — MARKETPLACE AUDIT
## Applied against CLAUDE-PROCEDURES.md framework
## Date: 2026-06-18

This audit applies the seven-tier hierarchy and all ten procedures to the current state of the Qerxel build. It is not a feature wishlist. It is an honest statement of what works, what is broken, what is untested, and what the gap is between what has been built and what is verifiably live.

---

## WHAT IS QERXEL (Prime Directive)

**For:** UK sole traders and micro-business owners — hairdressers, plumbers, personal trainers, beauty therapists, dog groomers — who cannot answer their phone while their hands are busy.

**What it does:** Q answers the call, triages it, captures the lead, offers a booking or callback, and handles it with warmth and professionalism. Every unanswered call is a lost lead. Qerxel eliminates that.

**Three products in play:**
- **Answer** — core AI call handling
- **Schedule** — calendar and online booking
- **Listen** — live AI copilot when the owner picks up themselves
- **Sentry** — CCTV booking reconciliation (add-on, early stage)

**The callers who contact these businesses are also stakeholders.** The ethical overlay applies to their experience as much as to the owner's.

---

## TIER 1 — PRIME DIRECTIVE AUDIT

**Finding: The prime directive is coherent and the product structure serves it.**

Answer → core purpose. Schedule → natural extension (the thing the caller wants is usually a booking). Listen → serves the owner when they do pick up. Sentry → serves the owner's operational visibility.

**Gap:** The sales channel (/try-q, Q Chat, sales demo calls) serves Qerxel's commercial purpose, not the prime directive directly. That is correct — but it means this part of the build is governed by different success criteria. It should not drift into the prime directive tier in decision-making.

**Gap:** The callers who contact these businesses have no voice in the design process. Q's tone, warmth, and handling of emergency keywords are the points where their interests are most at stake. These are defined in config but have never been tested by an actual caller receiving an actual call via a real Vapi assistant on a real phone. See Tier 5.

---

## TIER 2 — HUMAN EXPERIENCE AUDIT

### The new client path (what happens when someone signs up today)

**Step 1 — Signup:** Client navigates to /signup, creates account. Auth user created in Supabase.

**Step 2 — Onboarding:** Client completes Onboarding.jsx handleFinish().
- Tenant INSERT → ✅ Works (tenants_creator_email_read policy now allows SELECT back)
- Membership INSERT → ✅ Fixed this session (now happens second, before services)
- Services INSERT → ✅ Works (membership exists when this runs)
- vapi-sync → ✅ Works (try/catch added, outcomeType fixed, voice IDs fixed)
- Welcome email → Not audited

**Step 3 — First login to portal:** Client sees Portal.jsx with their data.
- Tested: Bloom & Co (sarah@bloomandco.co.uk) onboarded successfully via proper client path
- Gate 1 (code written) ✅, Gate 2 (real user path) ✅, Gate 3 (correct data) ✅

**The new client path works as of this session. Before this session it was completely broken — every real signup would have silently failed at Step 2.**

**All 44 tenants currently in the database were seeded via management API (management API bypasses RLS). Bloom & Co is the only tenant whose data was created through the portal's own mechanisms. The RLS failures this session discovered had never been seen before because the bypass masked them.**

---

## TIER 3 — COMPONENT DESIGN AUDIT

### Answer (AI call handling)

| Component | Status | Issue |
|-----------|--------|-------|
| vapi-sync.js (create/patch assistants) | ✅ Working | Fixed this session — try/catch, outcomeType, voice IDs |
| vapi-assistant-request.js (support calls) | ✅ Fixed | Voice IDs were `aura-luna-en`/`aura-stella-en` — fixed this session |
| _build-prompt.js | ✅ Working | outcomeType bug fixed this session |
| AIBehaviour.jsx (owner config) | ✅ Working | Saves to Supabase, triggers vapi-sync, shows sync feedback |
| AIFoundation.jsx | ✅ Working | Read-only config summary, annotated guardrails |
| PhoneLines.jsx | Not audited | Twilio line config — not tested via real caller |
| Test call ("Call me now") | ✅ Built | Uses real Vapi assistant. Not tested in this session. |

**Critical gap:** No production call has ever been received by any Vapi assistant created through the real client path. Bloom & Co has a Vapi assistant (`f38d047a...`). That assistant has never received a call. The entire Answer product is a chain of untested assumptions at the telephony boundary.

### Schedule (calendar and booking)

| Component | Status | Issue |
|-----------|--------|-------|
| Calendar.jsx | ✅ Built and tested (seeded data) | Not tested via real client adding real appointments |
| BookingPage (public) | ✅ Built | Booking via public link not tested end-to-end |
| CalendarIntelligence | ✅ Built | Operates on seeded data |
| Listen (live copilot) | Built — UI exists | Billing gate not wired. Activation not wired. |

**Listen on payment page: Listen IS present in PlanSelector.jsx (LISTEN_TIERS). Philip flagged it as missing — needs visual verification. The tiers are defined; whether they render correctly in the UI has not been confirmed.**

### Sentry (CCTV reconciliation)

| Component | Status |
|-----------|--------|
| DB tables | Created |
| Canvas zone editor | Built |
| Variance dashboard | Built |
| Real camera data | None — no Sentry customer exists |

Sentry is fully built against phantom data. This is acceptable for pre-launch. The risk is that assumptions baked into the zone detection logic have never met a real camera feed.

### Q Sales Demo (/try-q)

| Component | Status | Issue |
|-----------|--------|-------|
| SalesChat.jsx | ✅ Built | |
| Q Chat (text) | ✅ Working | |
| "Hear Q live" outbound call | ✅ Built | Uses `select_demo_tenant` — matches against seeded tenants. Those tenants exist in live DB. |
| Voice ID in outbound | ✅ Fixed this session | Was `aura-luna-en` → now `luna` |

**Gap:** The sales demo calls use seeded demo tenants created via management API. Those are real rows in a production database, not a demo environment. Any data generated during demo calls (call logs, leads) will mix with real client data. This needs a plan before launch.

### Q Support Line

| Component | Status |
|-----------|--------|
| Support call detection + handling | Built — code exists |
| DB tables | 4 tables — SQL was pending execution as of last session |
| SupportIntelligence.jsx | Built — owner-only gate |
| 10x compensation policy | Logic built |

**Gate 2 and 3 not passed. Support line has not received a test call.**

### Q Live Session (portal navigation during support calls)

Fully architected and built. Has never been exercised by a real support call.

### Master Control

Built and deployed. System signals, element registry, warden cron, Meaning Map. All operating on synthetic or self-generated data — no real calls flowing through.

---

## TIER 4 — SYMBIOSIS AUDIT

**What creates genuine emergent value:**

- Answer + Schedule: Q captures a caller and offers a booking directly. The slot is real, the client lands in the calendar. This is the core symbiosis. **Not yet tested end-to-end with a real call.**
- Listen + Answer: When the owner picks up, Listen shows caller history from Answer data. Depends on Answer building the call history first. **Not tested.**
- Sentry + Schedule: Reconciles physical occupancy against appointments. Only meaningful once real appointments exist. **Not yet.**
- Q Score + QMood + HelpMascot: Owner sees their performance score, mood, and coaching in real time. Built, operating on seeded data.

**Where symbiosis is broken:**

- Sales demo (`select_demo_tenant`) → uses live production tenants as demo subjects. This is not symbiosis — it is scope leakage. The demo builder architecture was agreed last session but not built. Until it is, the sales path is running on borrowed infrastructure.
- Support line → Q navigates the portal during a support call via Q Live Session. This is real symbiosis but entirely untested at the telephony layer.

---

## TIER 5 — REAL-WORLD VERIFICATION AUDIT

This is where the build has its most significant gap.

**Verified by a real authenticated user this session:**
- Onboarding path (Bloom & Co)
- Tenant creation, membership, services
- vapi-sync on a new tenant
- RLS policies (tenants, tenant_memberships, services)

**Built but not verified via real user:**

| Feature | What's missing |
|---------|---------------|
| Answer receiving a real inbound call | No number assigned to Bloom & Co. No test call made. |
| Booking flow — caller books via Q | Requires working Answer call first |
| Booking flow — public booking page | Not tested end-to-end (visitor books → appointment lands in calendar) |
| Listen activation per-client | Billing gate not connected |
| Support line test call | Not made |
| Q Live Session during real support call | Not tested |
| Welcome email delivery | Not verified (fire-and-forget, no log) |
| Stripe payment processing | Not wired — all tiers set manually in DB |
| SignUp.jsx → full onboarding | Tested via script; not tested via browser |

**The entire telephony layer (Answer, Support Line, Sales Demo calls) is unverified at the point where it matters most — a real phone, a real caller, a real Vapi assistant.**

---

## TIER 6 — FAILURE DESIGN AUDIT

### Improvements made this session

- vapi-sync now wraps entire handler in try/catch — returns JSON error with message and stack
- vapi-assistant-request.js: voice IDs corrected (wrong IDs caused silent Vapi rejection)

### Remaining failures that are silent or invisible

| Failure | What happens | Risk |
|---------|-------------|------|
| vapi-sync called but Vapi rejects | Returns 500 JSON — but handleFinish() fires it as fire-and-forget. Client onboards with no Vapi assistant. They just don't get calls answered. | High |
| Welcome email fails | Fire-and-forget. No log. Client gets no email. No one knows. | Medium |
| Support line SQL tables not run | Support calls fail silently at DB write. Philip still shows as the only person who sees SupportIntelligence.jsx. | High — needs verification |
| Booking conflict (double booking) | Not audited — no real bookings have been made |
| RLS policy missing for new table | Any new table without correct policies fails silently for authenticated users | Medium |
| Stripe not wired | Subscriptions set manually. Any real signup defaults to whatever the DB has. No payment ever taken. | Critical for launch |

### Strongest failure design in the build

- Error boundary (ErrorBoundary.jsx) — frontend
- Rate limiting on sales demo calls (3/hour)
- Master Control — warden cron, system signals, Q write authority gate

---

## TIER 7 — EFFICIENCY AUDIT

The build is highly parallel. Multiple major systems (Sentry, Support Line, Q Live Session, Element Architecture, Q Sales Demo, Meaning Map) were built in rapid succession.

**The efficiency cost:** None of them has passed Gate 2 (real user path) or Gate 3 (correct data confirmed). The build has been width-first, not depth-first. This is fast. It is also how the onboarding failures and vapi-sync crashes were not caught until the forced walkthrough.

**The walkthrough test (where Bloom & Co was created via the real client path) was the most valuable thing done in the last two sessions. It cost time and exposed serious failures. It should be the model going forward — not the exception.**

---

## PROCEDURE COMPLIANCE FINDINGS

| Procedure | Compliance | Finding |
|-----------|-----------|---------|
| 1 — Prime directive check | Partial | Not stated before each task in previous sessions |
| 2 — Domain isolation | Violated | Multiple domains built simultaneously in almost every session |
| 3 — Definition of done | Violated | Most features stopped at Gate 1 (code written) |
| 4 — Pre-build checklist | Not used | No evidence of the five questions being answered before any feature |
| 5 — Authority boundaries | Partial | DB schema done correctly. Data seeding violated the boundary. |
| 6 — No bypass rule | Violated | All 44 tenants seeded via management API |
| 7 — Error surface rule | Violated | vapi-sync had no try/catch until this session. Other endpoints not audited. |
| 8 — Scope discipline | Violated | Every session added features before existing features were verified |
| 9 — Symbiosis check | Not applied | Features built in isolation, not tested for integration |
| 10 — Efficiency rule | Partial | Efficient at building. Not efficient at verifying. |

**These procedures did not exist before this session. The findings above describe the state of the build before the procedures were written. The relevant question going forward is whether the procedures change the pattern.**

---

## SUMMARY — WHAT IS REAL RIGHT NOW

| Item | Real |
|------|------|
| Portal UI (all pages) | ✅ Built, largely functional |
| Onboarding flow | ✅ Works — fixed this session |
| One real client account | ✅ Bloom & Co (sarah@bloomandco.co.uk) |
| RLS architecture | ✅ Correct — fixed this session |
| vapi-sync | ✅ Works — fixed this session |
| Vapi assistants on real accounts | ✅ One (Bloom & Co) |
| Actual calls answered by Q | ❌ None |
| Actual bookings made via Q | ❌ None |
| Stripe payments | ❌ Not wired |
| Real customers using the product | ❌ None |
| Support line tested | ❌ Not tested |

---

## RECOMMENDED NEXT ACTIONS (in priority order)

1. **Assign a Twilio number to Bloom & Co and make a test call.** This is the single most important verification. Until Q answers a real call on behalf of a real client, the core product is unproven at the most critical point.

2. **Verify the public booking page end-to-end.** Visitor arrives → selects service → books → appointment lands in calendar. One real booking confirms the Schedule → Answer symbiosis.

3. **Wire Listen to billing.** Listen tab is built but activation is not connected to the payment tier. Any client on a Listen tier currently gets the tab but the activation state is undefined.

4. **Run the Support Line SQL migration.** Four tables are pending. Until they run, the support line fails at the DB write.

5. **Plan the demo environment.** The sales demo uses production tenants. Before real clients are in the system this is tolerable. After launch it is not.

6. **Audit error surfaces across all API endpoints.** vapi-sync now has try/catch. No audit has been done on the other endpoints (vapi-webhook.js, vapi-assistant-request.js, admin.js, chat.js, integrations.js, freeagent.js). At least one of those will have the same silent crash problem.

---

*Audited against CLAUDE-PROCEDURES.md v1.0 — 2026-06-18*
*Auditor: Claude Sonnet 4.6*
