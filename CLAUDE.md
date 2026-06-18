# QERXEL — SESSION START
## Read this file first. Then read the domain files relevant to your task.
## UPDATE CLAUDE-TASKS.md before ending any session.

---

## How this documentation works

This project's reference material is split across domain files so that no single context window has to carry everything. **This file is the entry point only** — it tells you what exists and when to read it.

**Session start:**
1. Read this file completely.
2. Read [CLAUDE-RULES.md](CLAUDE-RULES.md) and [CLAUDE-PROCEDURES.md](CLAUDE-PROCEDURES.md) — both are mandatory every session, not optional domain reads.
3. Look at the task. Identify which domain files apply (see table below).
4. Read those files before touching any code.
5. Do not rely on memory from previous sessions — verify against the files.

**During a session:**
When you discover something that contradicts a domain file, investigate — one of them is wrong. Update the file, don't work around the discrepancy.

**Session end (mandatory):**
- Mark completed tasks in CLAUDE-TASKS.md with date
- Add any new known issues to CLAUDE-TASKS.md
- Update "Next tasks" in CLAUDE-TASKS.md
- Update any domain file whose content changed this session (new columns → CLAUDE-SCHEMA.md, new files → CLAUDE-FILES.md, etc.)
- Update the "Last updated" line at the bottom of this file
- No exceptions. Drift is how projects fail.

**Truth hierarchy:** domain files > code reality > this file's summaries > anything else

---

## What this project is

AI call-handling and booking SaaS for UK sole traders and micro-businesses.
**Founder:** Philip Keating — strategic operator, not a developer. Uses Claude Code VSCode extension on Windows 11.
**Scale intent:** 500 tenants before any tech hire. All development via Claude Code.
**Working name:** Qerxel. Not legally confirmed.

---

## Read these files before doing any work in their domain

| File | When to read |
|------|-------------|
| [CLAUDE-RULES.md](CLAUDE-RULES.md) | **Always** — locked rules, deploy command, schema gotchas, visual tokens |
| [CLAUDE-PROCEDURES.md](CLAUDE-PROCEDURES.md) | **Always** — operating procedures, ethics, authority boundaries, definition of done |
| [CLAUDE-PRODUCTS.md](CLAUDE-PRODUCTS.md) | When touching product logic, tiers, or planning new features |
| [CLAUDE-SCHEMA.md](CLAUDE-SCHEMA.md) | Before any DB query or mutation — columns, constraints, known traps |
| [CLAUDE-ARCH.md](CLAUDE-ARCH.md) | When touching Portal, gating, data flows, booking page, owner preview |
| [CLAUDE-FILES.md](CLAUDE-FILES.md) | When locating a component, tab, hook, or API endpoint |
| [CLAUDE-TASKS.md](CLAUDE-TASKS.md) | To understand what's done, what's next, what's pending |

---

## Tech snapshot

| Layer | Technology |
|-------|-----------|
| Database | Supabase — project `kkrsvkxkefijmtbwykzv` |
| Frontend | React + Vite → Vercel |
| Auth | Supabase Auth |
| Telephony | Vapi (BYOK) · Deepgram Nova-2 · Cartesia Sonic |
| LLM | Gemini Flash (standard) · GPT-4o mini (premium) · Claude Haiku (Vera/support) |
| Email | Resend · SMS: Twilio · Payments: Stripe |
| AI | Firecrawl (scrape) · Make.com → n8n at 30 tenants |

**Live:** https://verante-portal.vercel.app
**GitHub:** https://github.com/philsk1/verante-portal
**Deploy:** `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod`
**Owner email:** finsolsoffice@gmail.com
**Owner selector:** `/owner/select`

---

## Session end checklist

- [ ] Mark completed tasks in CLAUDE-TASKS.md with date
- [ ] Add any new known issues to CLAUDE-TASKS.md
- [ ] Update "Next tasks" in CLAUDE-TASKS.md
- [ ] Update any domain file that changed this session
- [ ] Update "Last updated" line below

---

*Last updated: 2026-06-18*
*Updated by: session — CLAUDE-PROCEDURES.md written and elevated to always-read. CLAUDE.md session start updated to mandate procedures read. Voice IDs fixed across vapi-assistant-request.js and vapi-sync.js. Marketplace audit written to research/marketplace-audit.md.*
