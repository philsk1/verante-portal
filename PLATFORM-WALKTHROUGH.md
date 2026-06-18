# Qerxel Platform — Demo Walkthrough
## What we've built, what it does, and how to show it

---

## Two demo businesses are ready

Both are seeded with 12 months of contrasting data and available in the Owner Selector.

| Business | Tier | What it shows |
|---|---|---|
| **Bloom & Co Hair & Beauty** | Enterprise + Large calendar + Listen | High performer — strong data, healthy Q Intelligence signals |
| **The Style Collective** | Professional + Small Team calendar + Listen | Underperformer — Q Intelligence flags real problems |

Log in → `/owner/select` → select the business you want to demonstrate.

---

## The one-line pitch

> Qerxel answers your missed calls, books appointments while you're busy, and uses the same analysis tools big business pays for — to tell you in plain English what's going wrong and what to do about it.

---

## SECTION 1 — Owner Selector
**Navigate to:** `/owner/select`

**What you see:** A grid of all connected businesses. Each card shows the business name, tier, and Q's mood face — a real-time read of performance. Businesses can be sorted by QScore (best/worst), subscription value, staff count, or service type.

**Talking point:** "From here I can see every business I manage. The face on each card is Q's live assessment. Green means the business is performing well across calls, conversion and client retention. Red means something needs attention."

---

## SECTION 2 — Answer (AI Call Handling)
**Navigate to:** Answer → AI Behaviour

### Foundation Tab
Shows what Q knows about the business: services it can offer, staff it can book, opening hours, booking rules, triage mode.

**Talking point:** "Q reads the same catalogue and staff list that the calendar uses. If you add a service to the calendar, Q knows about it on the next call. The AI and the booking system share a single source of truth."

### Voice & Response
Set tone (professional / warm / direct), response delay, speech pace, escalation preference. Emergency keywords trigger immediate escalation regardless of mode.

### Call History
**Navigate to:** Answer → Call History

A chronological list of every handled call. Each row shows: caller, duration, outcome (booked / lead captured / referred / filtered / spam), and Q's summary of the call.

**Talking point:** "Every call Q handles gets logged, summarised, and categorised. You can see exactly what was said, what the outcome was, and whether a lead was captured or a booking was made — without listening to a single recording."

---

## SECTION 3 — Data Analysis
**Navigate to:** Data Analysis

This page has two tabs: **Call Performance** (Answer data) and **Q Intelligence** (booking pattern data). Both tabs are visible when the business has both Answer and Schedule.

---

### 3a — Call Performance Tab (show on Bloom & Co first)

**Headline numbers (Bloom & Co):**
- 248 total calls handled
- ~38% lead capture rate — strong (shown in green)
- Average call duration ~95 seconds

**Recommendation card:** With 38%+ lead capture, the card shows "Strong performance — expand your referral network to increase inbound volume."

**Feature cards (Enterprise — all live for Bloom):**
1. **Pricing Intelligence** — tracks price objections in call transcripts. Surfaces when callers say "that's a bit much" or ask for a cheaper option.
2. **Call Outcome Breakdown** — shows the split between booked, lead captured, referred, filtered, spam.
3. **Caller Patterns** — volume by day of week. Identifies peak call days.
4. **Competitor Intelligence** — surfaces competitor names mentioned by callers.

**Now switch to The Style Collective:**
- 182 calls, 15% lead capture — shown in red
- Recommendation: "Lead capture rate is 15% across 182 calls — below expected range."
- Feature cards: locked (Professional tier) with upgrade prompt visible.

**Talking point:** "Same platform, same AI, same features available — but the data tells a completely different story. Bloom is converting well. The Style Collective is losing 85% of callers without capturing a lead. Q has already spotted this."

---

### 3b — Q Intelligence Tab

Click the **Q Intelligence** tab. This loads appointment data from the calendar and runs four automatic analyses.

**Show on Bloom & Co (healthy signals):**

**Revenue Evaporation**
- 4 cancelled appointments this month
- 7 leads not converted
- *Q says:* "4 appointments cancelled this month. That's time in your diary that didn't earn. 7 leads came in and didn't convert — worth reviewing those caller notes."

**At-Risk Clients**
- 1 client flagged (Judith Haynes — 2 recent cancellations)
- *Q says:* "Repeated rescheduling is the earliest sign of a drifting relationship. A personal message costs nothing."

**Client Segments**
- ~28 Ritual clients (same day, same service — loyal)
- ~12 Explorer clients (trying different services — upsell opportunity)
- 2 Lapsed clients (went quiet 50–65 days ago)

**Staff Intelligence**
- Jade Morrison: ~68% re-booking rate (highest)
- Sophie Clarke: ~60%
- Marcus Webb: ~52%
- *Q says:* "Jade brings clients back at a 68% rate — the highest in the team."

---

**Now switch to The Style Collective (problems visible):**

**Revenue Evaporation**
- 16 cancelled appointments this month
- 39 leads not converted (out of 58 total)
- *Q says:* "16 appointments cancelled this month. 39 leads came in and didn't convert — worth reviewing those caller notes."

**At-Risk Clients**
- 10 clients flagged — most linked to Chris Patel
- Names visible: Carla Simmons, Denise Webb, Francesca Hunt, Gina Porter and 6 more
- *Q says:* "Repeated rescheduling is the earliest sign of a drifting relationship. Worth a personal message before they go quiet."

**Client Segments**
- Only 8 Ritual clients (vs 28 at Bloom)
- 18 Lapsed clients (vs 2 at Bloom)
- Few Explorers

**Staff Intelligence**
- Emma Lawson: ~45% re-booking rate
- Lisa Hartley: ~38%
- Chris Patel: ~20% (flagged by Q)
- *Q says:* "Emma brings clients back at a 45% rate — the highest in the team. Chris Patel's rate is 20% — worth understanding what's different."

**The full talking point:**
> "Q identified something the owner can't see from their diary. When clients see Chris, 4 out of 5 don't come back within 90 days. When they see Emma, nearly half do. This isn't a gut feeling — it's a pattern across 12 months of real appointment data. The Style Collective doesn't have an analyst. They have Q."

---

## SECTION 4 — Schedule (Calendar)
**Navigate to:** Calendar

**Day view:** Shows staff as columns, appointments as blocks in each column. Auto-adapts to day view for businesses with 3+ staff members.

**Week/month view:** For single-staff businesses or solo operators.

**What to show:**
- Click an empty slot — the booking panel slides open (staff, service, client name, notes)
- Existing appointments show service name and client name on the block
- Colour coding matches each staff member's assigned colour
- **Team mode** toggle at top right — shows/hides the multi-column view

**Talking point:** "This isn't just a calendar — it's the same data that Q reads on every call. The moment you close a booking here, Q can see it. No double entry, no sync delay."

---

## SECTION 5 — Schedule Analytics
**Navigate to:** Analytics (visible for Schedule and Answer tenants)

Shows:
- Total appointments booked this week/month
- Completion vs cancellation vs no-show rate
- Booking source breakdown (online vs direct)
- Service popularity by revenue and volume
- Busiest days and time slots

---

## SECTION 6 — Services & Team
**Navigate to:** Services → Service Catalogue

Manage the full list of services: name, category, price range, duration, overlapping processing time. This is what Q reads when a caller asks "what do you offer?" and what customers see on the booking page.

**Navigate to:** Team → Staff Directory

Manage staff profiles: name, role, availability, colour assignment. Staff availability is set per day with start/end times. Q only offers slots that match a staff member's availability.

---

## SECTION 7 — Listen (Live Copilot)
**Navigate to:** Listen

When the business owner picks up a call themselves, Listen activates on their screen and shows in real time:
- **Caller history** — has this person called before? Booked before? What did they want last time?
- **Available slots** — next openings that match what the caller is asking for
- **Live note-taking** — Q types as you speak
- **Direct booking** — book an appointment from the screen without leaving the call
- **Post-call summary** — automatically generated after the call ends

**Listen Pro** (£20/mo): adds catalogue hand-off — if the caller asks about a specific product, Listen searches the catalogue and can send a checkout link directly to the customer's phone while you're still on the call.

**Talking point:** "When you pick up the phone, Q is right there beside you. You're not searching for a client in a separate system, checking a paper diary, or trying to remember what they said last time. It's all on screen before they've finished saying hello."

---

## SECTION 8 — Sentry (Operational Reconciliation)
**Navigate to:** Sentry

Sentry compares what the camera sees (occupancy in a defined zone) against what's in the calendar. A chair that's occupied but has no appointment is flagged as a data variance — for review, not accusation.

**What to show:**
- The zone canvas (where you draw zones on a camera frame)
- The variance dashboard — shows unlogged service time per zone over the week
- Weekly email digest — headline numbers only, full report in the portal

**Talking point:** "Every service business has ghost capacity — time that was sold but never logged. Sentry doesn't make accusations. It just shows you the gap and lets you decide what it means. Is it a data-entry error? An unlogged call-in booking? Or something that needs a conversation? You decide. Q just shows you the numbers."

---

## SECTION 9 — Booking Page (Customer-Facing)
**Navigate to:** `/book/[tenant-id]`

The public booking flow — what a customer sees when you send them your booking link.

**Steps:**
1. Select a service from your catalogue
2. Choose a date from the availability calendar
3. Select a time slot and staff member (or "any available")
4. Enter name, phone, email
5. Confirmation screen — with business branding, promo banner if set, and Qerxel attribution

**Admin controls (Account & Billing → Booking page):**
- Upload your logo
- Set a brand colour (applied to header gradient, step dots, selections)
- Add a promotional banner (e.g. "Book before Friday — get 10% off your first appointment")
- Set cancellation cutoff (e.g. no cancellations within 24 hours)
- Toggle Qerxel discovery card on/off (Professional+)

---

## SECTION 10 — Account & Billing
**Navigate to:** Account & Billing

Shows current tier, usage, and the full plan selector.

**Plan Selector:** Shows all Answer tiers (Light / Standard / Professional / Enterprise) and all calendar tiers (Entry / Solo / Small Team / Growth / Large). Switching tiers will update Stripe when billing is live.

---

## Pricing summary

### Answer (AI Call Handling)
| Tier | Price | Key feature |
|---|---|---|
| Light | £29/mo | Basic call handling, lead capture |
| Standard | £49/mo | + Priority response, advanced triage |
| Professional | £69/mo | + Analytics, caller patterns |
| Enterprise | £249/mo | + Competitor intelligence, full analytics |

### Schedule (Calendar)
| Tier | Price | Columns | Messages/mo |
|---|---|---|---|
| Entry | Free | 1 | None |
| Solo | £19/mo | 1 | 250 |
| Small Team | £29/mo | 4 | 500 |
| Growth | £39/mo | 8 | 1,000 |
| Large | £49/mo | 20 | 2,000 |

### Listen (Live Copilot)
| Tier | Price | Included |
|---|---|---|
| Listen | £10/mo | 100 mins, 3p/min after |
| Listen Pro | £20/mo | 250 mins, 4p/min after + catalogue hand-off |

### Sentry (Operational Reconciliation)
| Cameras | Price |
|---|---|
| Up to 3 | £20/mo |
| Up to 5 | £25/mo |
| Up to 7 | £30/mo |
| Up to 9 | £35/mo |

---

## The contrast story (demo closing)

Show both businesses side by side (use the owner selector, tab between them):

| | Bloom & Co | The Style Collective |
|---|---|---|
| Calls | 248 | 182 |
| Lead capture rate | 38% | 15% |
| Cancelled this month | 4 | 16 |
| Leads unconverted | 7 | 39 |
| At-risk clients | 1 | 10 |
| Ritual clients | ~28 | ~8 |
| Lapsed clients | 2 | 18 |
| Best staff rebook rate | 68% (Jade) | 45% (Emma) |
| Lowest staff rebook rate | 52% (Marcus) | 20% (Chris) |

**The Style Collective is not a failing business — it's a business that doesn't know what's wrong.**

Q Intelligence tells them:
- Chris is losing clients at 4x the rate of Emma
- 10 clients are showing the early pattern of someone about to stop coming back
- 16 appointments cancelled this month — more than the others did in a quarter
- Of the 58 leads that came in, only 19 converted

Without Qerxel, none of this is visible. It shows up months later as a quiet period — by which time the clients are gone.

> "The analysis tools big business uses — now working on yours."

---

*This document reflects the platform as of June 2026. Both demo businesses are live in the portal.*
