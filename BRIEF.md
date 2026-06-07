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

## Strategy notes

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

