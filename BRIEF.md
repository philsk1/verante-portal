# Qerxel Working Brief

**Protocol — both windows read this at session start.**

- **Strategy window** — debate freely. Write ONLY the agreed decision (not the discussion) under `Ready to implement`. One line per item, enough detail that a cold window can act without context.
- **Coding window** — pull from `Ready to implement`, move to `In progress`, implement, move to `Done`. Never needs the debate — only the resolution.

---

## Ready to implement

**Pick-and-mix product selection screen**
Build a product selection UI. Three columns, one per product (Answer, Listen, Calendar). Customer selects their level within each independently. Rules: Calendar Entry always free with any subscription. Listen requires Answer. Advanced Listen (catalogue + competitor) requires Listen standard first. Price is calculated live from the combination selected. See product and pricing structure in Strategy notes below.


## In progress


## Done

- [x] Catalogue section in Business Profile tab — catalogue_items table migrated, UI built with service/product tabs, split appointment support, CSV upload.
- [x] Calendar booking engine — all 12 spec points. Staff schedules, service-driven slots, category colour, recurring series, intake capture, client history, reminder/buffer/no-show settings. Migration: supabase_calendar_booking_engine.sql.
- [x] Three-product navigation scaffold — sidebar groups into Answer / Calendar / Listen (locked) / Integrations with product labels, colour dots, and Listen coming-soon page.


---

## Standing instructions for clcode (apply to every build decision)

**Colour intent — LOCKED rule, portal-wide**
Colour must signal meaning, not just style. Every UI element that carries a state, decision, or intent must use the semantic colour system. No neutral grey on a meaningful state. Apply retroactively to every existing element — audit before adding new ones.
Semantic palette confirmed:
- Violet = brand / booked / completed
- Green = captured / won / active / open (relaxed intent)
- Blue = in-motion / referred / informational / balanced (neutral intent)
- Amber = money / pending / urgent / action-required
- Red = warning / escalated / strict (high-pressure intent)
- Grey = neutral / dead / filtered / spam only

Example: triage modes Strict/Balanced/Open must use Red/Blue/Green respectively, not identical violet cards.

---

## Strategy notes

**Three-product pricing and structure — confirmed (2026-06-07)**

Three independent products. Customer picks from each independently. No forced bundling. Price is the sum of what they select.

**Product 1: ANSWER**
Existing tier structure unchanged — Light £29 / Standard £49 / Professional £69 / Enterprise £249. Minute-metered overage as currently configured.

**Product 2: LISTEN**
Passive live call listening. Priced per minute. Two levels:
- Standard 3p/minute — real-time transcription, intent detection, date mentioned → calendar link surfaced, booking trigger, post-call summary
- Advanced 4p/minute — everything in standard + real-time catalogue card surfacing when service mentioned + live competitor intelligence when competitor mentioned (live web lookup)

One minute pool across all three products — cost to Qerxel is consistent regardless of task.

**Product 3: CALENDAR**
Entry level always free with any subscription — single person, no exceptions, non-negotiable sweetener.
Paid levels: multi-staff calendar, service-driven slot generation, staff profiles, work schedules, reminders, waitlist, intake forms, self-serve booking page, capacity view, full catalogue integration.

**The pick-and-mix logic:**
- Sole trader wanting calls covered + basic live help → Answer (any tier) + Listen Standard + Calendar Entry (free) 
- Salon with multiple staff → Answer + Listen Standard + Calendar multi-staff
- Electrical distributor → Answer + Listen Advanced + Calendar Entry (free)
- Full enterprise → Answer Enterprise + Listen Advanced + Calendar multi-staff

**Four named front-door packages** (configurator lives behind "build your own"):
- Solo ~£29 — Answer Light + Listen Standard + Calendar Entry
- Professional ~£49 — Answer Standard + Listen Standard + Calendar Entry
- Team ~£69 — Answer Standard + Listen Standard + Calendar Multi-staff
- Enterprise £249 — Answer Enterprise + Listen Advanced + Calendar Multi-staff

**Three-product architecture — confirmed (2026-06-07)**
Qerxel is three standalone products, symbiotic but each sold independently.
1. **Answer** — AI handles missed calls, captures leads, triages intent
2. **Listen** — live call listening with real-time on-screen assist (Qerxel Assist)
3. **Notes** — note-taking, on-screen data surfacing, calendar integration

Product names are pending Philip's research — use Answer / Listen / Notes as placeholders. Names are incidental — build proceeds now. Swap strings when confirmed.

Benchmark: HubSpot hub model. Key decisions adopted:
- Product identity first: each product gets a name, a colour tint, and its own nav section
- Dashboard is composable: grows with owned products, not reorganised. One product = focused dash. Two = gains a section. Three = full.
- Home screen reflects ownership: paid products prominent + functional. Unpaid = soft upsell visible, never clutter.
- Cross-product data moments are labelled ("from your Answer AI") so value is visible, not invisible.
- Current tab structure is feature-organised. Decision confirmed: move to product-organised navigation. Use placeholder names now.

**Calendar — booking engine specification (2026-06-07)**
Foundation already in DB: catalogue_items (duration_minutes, processing_minutes), staff_availability table, react-big-calendar with DnD built.

Build order and full spec:
1. Staff profiles — name, role, services they can perform (skill mapping to catalogue_items)
2. Work schedules per staff — recurring weekly pattern, exceptions, holiday blocking
3. Service-driven slot generation — selecting a service from catalogue auto-stamps duration + processing gap, no manual time entry
4. Staff-to-service matching — booking UI only shows staff qualified for the selected service
5. Buffer automation — configurable gap between appointments, system-enforced
6. Reminder cadence — SMS/email at 48h, 24h, 1h before (configurable per tenant)
7. No-show / late cancel policy — configurable fee, auto-charged
8. Waitlist — slot fills → customer joins waitlist → auto-notified on cancellation
9. Intake capture — pre-appointment questions collected at booking time
10. Recurring series — book same slot weekly/fortnightly
11. Colour by service type — service category drives appointment colour, not just status
12. Customer booking history — every appointment linked to lead/contact record

13. Capacity view — day-level indicator showing how full the day is at a glance, no counting
14. Self-serve booking page — customer-facing URL, tenant-branded, customers book without a phone call

Benchmark: Jane App, Booksy, Acuity Scheduling.

**Qerxel Assist — confirmed vision (2026-06-07)**
Three modes: Full AI handling / Listen & Assist / Listen & Note.
Activation phrase: operator says "I'll just get my AI Qerxel to take a note" — natural, informs customer AI is present (recording consent), engages the AI, name-tags the brand.
Real-time intent → portal card surfacing: product/service mentioned → catalogue card; date mentioned → calendar opens with draft booking; operator says "Qerxel book that in" → confirmed.
Booking model: AI proposes draft → operator confirms → customer told. Never auto-books.
Portal open during call = client workflow responsibility.
Query architecture = tech responsibility.
Philip's only concern: customer experience.
Catalogue is the foundational data layer — build first, improves existing missed-call AI immediately, backbone of Assist later.
Latency target <2 seconds spoken word → card on screen. Achievable with current stack. Not a blocker.

