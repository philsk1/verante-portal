# QERXEL — PRODUCT SUITE
## What each product is, who it's for, how it connects, where it goes next

---

## Philosophy

Qerxel is not trying to match enterprise software. It is building a full suite of tools that fits smaller enterprises perfectly — things that used to cost enterprise money, delivered at sole trader prices. Every product must earn its place by being genuinely useful on its own AND more valuable when combined with the others.

The free calendar is the entry point. It is deliberately feature-rich because it is worth more to an Answer buyer than a standalone calendar buyer — the integration between the two is the real product.

---

## Answer

**What it is:**
AI call handling. Q answers missed calls, triages caller intent, captures leads, routes to booking or callback. The core product. The reason Qerxel exists. Sole traders miss calls constantly — every missed call is a missed lead.

**Who it's for:**
Any sole trader or micro-business that gets inbound phone enquiries. Especially high value for: tradespeople, therapists, beauty, legal, financial advisors — anyone whose phone rings while their hands are busy.

**Tiers:** `free` (PAYG) · `light` (£29) · `standard` (£49) · `professional` (£69) · `enterprise` (£249) · `bespoke`

**What it includes by default:**
Every Answer subscriber gets a Schedule entry calendar included. This is the Trojan horse. They start using it, get comfortable with online bookings, and the integration value becomes obvious.

**How it integrates with the suite:**
- **Schedule** — Answer reads `catalogue_items` and `staff_profiles` to understand the business during calls. It can book directly into `appointments`. The calendar it gave them for free is the same calendar it reads.
- **Listen** — Answer provides the telephony infrastructure that Listen augments. Without Answer, Listen has no call to copilot.
- **Sentry** — Answer call data feeds into discrepancy detection. A call logged as "booking enquiry" with no corresponding appointment is a Sentry signal.
- **Booking page** — Confirmation emails fire from Answer's webhook. The booking confirmation carries the "provided free by Qerxel" attribution.

**What it is NOT:**
Not a full phone system. Not a CRM. Not a PBX. It handles missed calls and captures intent. Picked-up calls are handled by Listen (augmentation), not Answer.

**Natural extension:**
- Outbound callbacks (AI calls leads back automatically)
- Voicemail transcription and triage
- Multi-number routing
- Deeper calendar integration (AI negotiates available slots in real time)

---

## Schedule

**What it is:**
Online booking calendar. Customers book themselves. Owner manages appointments, staff, availability. The free Trojan horse that gets businesses in the door.

**Who it's for:**
Any service business that takes appointments. Hair, beauty, therapy, trades (site visits), consultancy, legal, medical. Especially powerful for businesses that currently take bookings by phone or DM — Schedule makes them 24/7.

**Tiers (calendar_tier column — to be extended as tier names are confirmed):**

| Tier | Price | Columns (staff) | Search depth | Messages /mo | Notes |
|------|-------|-----------------|--------------|--------------|-------|
| Entry | Free | 1 | None | 0 | Hook. Free for life. Qerxel branding non-removable. |
| Solo | £19 | 1 | 3 months | 250 | Adds marketing intelligence + messaging. Same column count as Entry. |
| Small Team | £29 | 4 | 12 months | 500 | |
| Growth | £39 | 8 | 24 months | 1,000 | |
| Large | £49 | 20 | All time | 2,000 | |

"Search depth" = how far back marketing intelligence queries look (call log + booking history).
"Messages" = outbound SMS/email campaign sends per month from search results.

DB currently uses `calendar_tier = 'entry'` or `'multi'`. Full 5-tier split to be implemented when billing is active. For now treat 'multi' as anything above Entry.

**Schedule-only customers (`subscription_tier = 'schedule_only'`):**
- Get the Schedule nav: Calendar · Team · Services · Analytics · Partners
- Answer upsell strip visible in sidebar
- No Answer coaching from Q (coaching points suppressed in QScoreContext)
- Full booking page with Qerxel discovery card (non-removable — it's the price of free)

**How it integrates with the suite:**
- **Answer** — shares `catalogue_items` and `staff_profiles`. The AI knows the same services and staff the calendar uses. A phone enquiry can result in a booking in the same calendar.
- **Sentry** — `appointments` is the ground truth Sentry reconciles against. If a camera zone shows occupancy but no appointment exists → variance flagged.
- **Listen** — when the owner picks up a call, Listen shows the caller's appointment history and suggests available slots.
- **Booking page** — public `/book/:tenantId` page. Customers self-book. Confirmation email includes manage-booking link with `cancel_token`.

**Booking page — commercial logic:**
- Free calendar users: full Qerxel discovery card on confirmation. Non-removable.
- Paid Answer or multi-staff calendar: branding available (custom colour, logo URL). Discovery card shown by default.
- Professional+: can optionally hide discovery card. "Booking service provided free by Qerxel business software" footer always shows. Non-negotiable.
- Brand colour and logo URL stored on `tenants`. Applied to header gradient, step dots, selections.
- Promo banner: `booking_promo_text` + optional `booking_promo_expires_at`. Shown as amber card between header and booking form.

**What it is NOT:**
Not a POS. Not a payment processor. Not a CRM (yet). Appointments create client name/phone/email records but these are not yet a unified contacts layer.

**Natural extension:**
- Client profiles (unify callers + booking clients into one Contacts view)
- Revenue tracking per service and per client
- Automated reminders (hourly cron via n8n/Make.com already wired — just needs setup)
- Waitlist / cancellation backfill
- Group bookings / class scheduling
- Package / series bookings (e.g. course of 6 sessions)

---

## Listen

**What it is:**
Real-time AI screen copilot. When the owner picks up a phone call themselves, Listen activates on their screen — surfacing customer history, available slots, service suggestions, and creating bookings as they speak.

**Who it's for:**
Answer customers who still want to take some calls personally. Gives them AI-grade context the moment the call connects.

**Tiers:**

| Tier | Price | Included mins /mo | Overage | listen_tier value |
|------|-------|-------------------|---------|-------------------|
| Listen | £10 | 100 mins | 3p/min | `standard` |
| Listen Pro | £20 | 250 mins | 4p/min | `pro` (to be added) |

Cost to serve: ~1.5p/min (Deepgram STT + Haiku inference). No telephony owned — software overlay only.
DB currently uses `listen_tier = 'none'` or `'standard'`. `'pro'` to be added when billing is active.

**Dependency:** Requires Answer OR paid Schedule. Cannot stand alone — needs telephony infrastructure.

**How it integrates with the suite:**
- **Answer** — shares the call infrastructure. Listen activates when the owner intercepts a call Answer would otherwise handle.
- **Schedule** — shows the caller's appointment history. Creates bookings directly into the calendar during the call.
- **Sentry** — future: could flag calls where a booking should have been created but wasn't.

**Listen Pro — catalogue hand-off (higher tier):**
Receptionist flags a product enquiry mid-call → Listen searches `catalogue_items`, surfaces matches + alternatives on screen, sends a checkout link directly to the customer (points to product's own URL — Qerxel never touches the transaction). Requires a `product_url` field on `catalogue_items` (not yet added).

**What it is NOT:**
Not a call recording product. Not a transcription service. It's a screen copilot — it helps the human on the call, not a replacement for them.

**Natural extension:**
- Post-call summary auto-generated
- Auto-create follow-up tasks from call content
- Client sentiment tracking over multiple calls

---

## Sentry

**What it is:**
Operational data quality tool. Compares what happened physically (camera occupancy data per zone) against what was logged in Schedule (appointments). The gap — occupied station with no appointment — is flagged as a variance for the owner to review.

**Language rules — non-negotiable:**
- NEVER: "revenue leak", "theft", "off-the-books", "missing money", "fraud", "surveillance"
- ALWAYS: "service reconciliation", "booking accuracy", "data variance", "unlogged service time", "station performance"
- Framing: **data quality tool**. The gap could be a data-entry error, unlogged phone booking, service that ran long. No implication of intent.

**Who it's for:**
Service businesses with physical stations — beauty salons, barbershops, physio clinics, any business where "chair time" is the inventory. Most already have CCTV — Sentry activates cameras they already own.

**Dependency:** Requires Schedule (needs appointment data for reconciliation).

**Tiers (Sentry add-on, stored as `sentry_camera_limit`):**
| Cameras | Monthly |
|---|---|
| Up to 3 | £20 |
| Up to 5 | £25 |
| Up to 7 | £30 |
| Up to 9 | £35 |

**Built:** Yes (task 28). Q-guided wizard setup, zone canvas editor, variance dashboard, 4-digit optional PIN gate, always visible in sidebar (locked for non-subscribers). Owner preview always bypasses PIN.

**Delivery:** Weekly email digest (headline only) + full portal dashboard.

**What it is NOT:**
Not surveillance. Not biometrics. Not face detection. Processes pixel-change data per defined zone only. No personal data stored or transmitted from camera feeds.

**Natural extension:**
- Automated PDF export of weekly variance report
- Zone heatmaps (busiest times per station)
- Integration with till/POS data (future — separate product or integration)

---

## Q Intelligence — The Data Layer (Future Product Generation)

When all ten data streams are synchronized (call transcripts, appointments, services, staff, caller history, leads, cancellations, zone occupancy, referrals, booking attribution), Qerxel becomes a behavioural and spatial simulator — not just a record-keeping system.

This was validated independently by Gemini and GPT when presented with the ten streams unframed. Both converged on the same insight: the value is in cross-examination, not in any individual stream.

**Stage map:**
| Stage | What it does | Status |
|-------|-------------|--------|
| Capture | Logs all ten streams | Done |
| Report | ScheduleAnalytics, DataAnalytics, Sentry dashboard | Done |
| Warn | Churn horizon, fragility index, burnout signals | Next generation |
| Predict | Slot demand forecasting, demand topology | Future |
| Prescribe | "Delete this service, move this station, protect this client" | Far future |

**Priority intelligence features to build (no new data collection needed — all computable from existing tables):**

**Revenue Evaporation Map**
"Where did revenue leave the building?" rather than "what came in?"
Sources: missed calls (call_logs), failed lead conversions (leads), cancellations (appointments), abandoned online sessions.
A dashboard panel showing the gap between potential and captured revenue.

**Behavioral Segmentation (Ritual / Explorer / Recovery)**
Computable from appointments + caller history RIGHT NOW.
- Ritual: same day/time/staff/service, ≥3 bookings → stable, schedule-sensitive
- Explorer: service category changes across last 5 bookings → innovation signal, upsell opportunity
- Recovery: long gap then re-booking, often after cancellation cluster → emotionally driven, handle carefully
These segments power the marketing intelligence search — "show me all Explorer clients inactive 6+ weeks."

**Customer Fragility Index**
Predict churn before it happens. A client who has rescheduled 3 consecutive times is fracturing.
Sources: cancellation timestamps, rebook gaps, transcript sentiment shift (terse vs warm language).
Not "churned" after 90 days — "at risk" before they stop showing up.

**Staff Retention Magnet / Churn Catalyst**
Only possible because Qerxel has both the call layer AND booking outcomes.
Track: re-booking rate per staff member, client churn correlation per staff member, sentiment in transcripts following interactions.
Identifies which staff member increases client booking velocity and which is a silent churn catalyst.
Genuine competitive moat — no salon software has the transcript layer to detect this.

**Competitive Intelligence Without Competitor Data**
Call volume up + conversion rate down + price objections up = a competitor has moved.
All three signals already captured (call_logs, leads outcomes, transcript vocabulary).
Belongs in DataAnalytics, gated to Growth+ tier.

**Slot Demand vs. Frustrated Demand**
Blend call transcripts + lead pipeline + appointments to map the delta between realized and frustrated demand.
"15 people called asking for Saturday 11am last week and couldn't be accommodated" → that slot has measurable suppressed value.
Informs pricing, opening hours decisions, and hiring.

**What this is NOT building:**
- Weather integration / demand chain simulation (too complex, external data)
- Physical layout digital twin (Sentry's long-term evolution, not near-term)
- Stock, accounts, payroll (permanently off limits)

---

## Allied Services — Under Consideration

The strategic question: what else does a small/micro business need that Qerxel could provide better than a generic tool, and that becomes more valuable when combined with Answer + Schedule?

**Candidates for exploration:**

**Payments & Deposits**
Take card deposits at booking. Reduce no-shows without a confrontational policy. Stripe already wired for subscriptions — extending to booking deposits is a natural step. Not competing with a payment processor — just embedding payment into the booking flow.

**Client Communications**
Automated sequences triggered by appointment state: pre-appointment reminders, post-appointment follow-ups, re-engagement for lapsed clients. More sophisticated than the current reminder emails. Ties closely to Schedule and any future Contacts layer.

**Reviews & Reputation**
Automated Google/Trustpilot review request after completed appointment. `/api/integrations` already has a `review-request` action. Could be a lightweight managed reputation product rather than a one-off trigger.

**Estimates & Quotes**
For tradespeople specifically: send a quote from the portal, client approves, auto-creates appointment and deposit request. Bridges Schedule and Payments. Very underserved for sole trader trades.

**Staff Scheduling & Rota**
Beyond the current team calendar — staff rota management, hour tracking, holiday requests. Would appeal to businesses with 3-8 staff. Gets into HR-lite territory.

**Contacts (the minimum viable CRM)**
Unify `callers` (Answer) and booking client records (Schedule) into a single Contacts view per tenant. Communication timeline: calls, bookings, messages in one place. This is the connective tissue between products, not a standalone CRM. Should be built when the absence of it starts costing feature value — not before.

---

## Integration map

```
                    ┌─────────────────┐
                    │    catalogue    │ ← shared by Answer + Schedule
                    │  staff_profiles │ ← shared by Answer + Schedule
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼─────┐      ┌─────▼─────┐     ┌─────▼──────┐
     │  ANSWER  │      │ SCHEDULE  │     │  SENTRY    │
     │ AI calls │      │ Bookings  │     │ Reconcile  │
     │ Leads    │      │ Calendar  │     │ zones vs   │
     │ Referrals│      │ Online bk │     │ appts      │
     └────┬─────┘      └─────┬─────┘     └────────────┘
          │                  │
     ┌────▼──────────────────▼────┐
     │          LISTEN            │
     │   Copilot on picked-up     │
     │   calls — shows history,   │
     │   creates bookings live    │
     └────────────────────────────┘
```
