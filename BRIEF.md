# Qerxel Working Brief

**Protocol — both windows read this at session start.**

- **Strategy window** — debate freely. Write ONLY the agreed decision (not the discussion) under `Ready to implement`. One line per item, enough detail that a cold window can act without context.
- **Coding window** — pull from `Ready to implement`, move to `In progress`, implement, move to `Done`. Never needs the debate — only the resolution.

---

## Ready to implement


## In progress


## Done

- [x] Catalogue section in Business Profile tab — catalogue_items table migrated, UI built with service/product tabs, split appointment support, CSV upload.


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

