# Qerxel Knowledge Base — Index

Q uses these files to answer questions from clients, Philip, future staff, and future developers.
Each file covers one domain. Each H2 section is one retrievable article.
To add knowledge: add an H2 section to the right file and re-run the embedding script.

---

## Layer 1 — User-facing: How to use each feature

| File | Covers |
|------|--------|
| [KB-GETTING-STARTED.md](KB-GETTING-STARTED.md) | Onboarding, first setup, readiness checklist, going live |
| [KB-BUSINESS-PROFILE.md](KB-BUSINESS-PROFILE.md) | Business name, opening hours, context, contact name, booking link |
| [KB-AI-BEHAVIOUR.md](KB-AI-BEHAVIOUR.md) | All AI settings — triage, tone, speech, escalation, instructions |
| [KB-CALL-HANDLING.md](KB-CALL-HANDLING.md) | The five call types and how to configure each one |
| [KB-MESSAGING.md](KB-MESSAGING.md) | After-call messages — types, channels, templates, variables |
| [KB-CALLER-INTELLIGENCE.md](KB-CALLER-INTELLIGENCE.md) | Caller recognition, suppliers, partners, spam, blocked numbers |
| [KB-STAFF.md](KB-STAFF.md) | Staff directory, availability, skills, direct lines |
| [KB-SERVICES.md](KB-SERVICES.md) | Service catalogue, products, pricing, duration |
| [KB-CALENDAR.md](KB-CALENDAR.md) | Calendar, appointments, booking management |
| [KB-LISTEN.md](KB-LISTEN.md) | Call log, transcripts, AI summary, outcomes, live desk |
| [KB-ANALYTICS.md](KB-ANALYTICS.md) | Q Intelligence, outcome breakdown, revenue, fragility, segments |
| [KB-QSCORE.md](KB-QSCORE.md) | Q score system, pillars, coaching, mood |
| [KB-INTEGRATIONS.md](KB-INTEGRATIONS.md) | WhatsApp, Zapier, FreeAgent, Google Calendar, review platforms |
| [KB-CONNECTIONS.md](KB-CONNECTIONS.md) | Connecting Vapi, phone numbers, call forwarding, Twilio |
| [KB-ACCOUNT.md](KB-ACCOUNT.md) | Account settings, billing, tiers, plan changes |
| [KB-TROUBLESHOOTING.md](KB-TROUBLESHOOTING.md) | Common problems and how to fix them |

---

## Layer 2 — Technical: How the system works (for developers and AI builders)

| File | Covers |
|------|--------|
| [KB-TECH-ARCHITECTURE.md](KB-TECH-ARCHITECTURE.md) | Full system overview, data flows, multi-tenancy, deployment, environment variables |
| [KB-TECH-DATABASE.md](KB-TECH-DATABASE.md) | Complete database schema — every table, column, constraint, query pattern |
| [KB-TECH-API.md](KB-TECH-API.md) | Every API endpoint — inputs, outputs, processing logic, auth |
| [KB-TECH-PROMPTS.md](KB-TECH-PROMPTS.md) | The AI prompt system — all three layers, greeting logic, caller context, analysis plan |
| [KB-TECH-FRONTEND.md](KB-TECH-FRONTEND.md) | Frontend structure: every page, every context, routing, product flags, slot generation |
| [KB-TECH-DEPLOYMENT.md](KB-TECH-DEPLOYMENT.md) | Deploy command, Vercel config, Vapi setup, Twilio setup, environment variables |
| [KB-TECH-DECISIONS.md](KB-TECH-DECISIONS.md) | Why decisions were made — architectural reasoning, tradeoffs, hard rules explained |

---

## Layer 3 — Operational: How Philip runs the business

| File | Covers |
|------|--------|
| [KB-OPERATIONS.md](KB-OPERATIONS.md) | Onboarding clients, provisioning numbers, troubleshooting, business rules, pricing tiers |
| [KB-COMPLAINTS.md](KB-COMPLAINTS.md) | Full complaint procedure: 4 categories, strike system, service failure protocol, mass payment, configuration defence, escalation triggers |

---

## Writing rules for new articles (Layer 1)

- Write for a non-technical UK sole trader or micro-business owner
- Plain English — no jargon without explanation
- Each H2 = one article = one RAG chunk (keep under 400 words)
- Answer the question fully in the section — do not refer to other sections for core meaning
- Use **What to do:** and **Example:** sub-headings where helpful
- Never assume the reader has read anything else

## Writing rules for new articles (Layer 2)

- Write for a developer or AI that needs to recreate the system from scratch
- No gaps, no "see code for details" — the document IS the specification
- Exact table names, exact column names, exact function names, exact env var names
- Include actual code snippets where the implementation is non-obvious
- Document the WHY as well as the WHAT — architectural decisions should be explained

## Writing rules for new articles (Layer 3)

- Write for Philip or someone Philip has handed the business to
- Procedural — step by step where process matters
- Include the exact commands, dashboard paths, and manual steps
- Document edge cases and known issues
