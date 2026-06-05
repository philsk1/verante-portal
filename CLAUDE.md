# Qerxel Portal — Project Brief

This file is auto-loaded by Claude Code at the start of every session.
It is the single source of truth for project context, strategy, and state.
Update it at the end of every working session.

**Full strategic context:** `QERXEL-HANDOFF-V12.md` in project root. Read it at session start for product strategy, tier structure, AI architecture, and GDPR obligations.

---

## What Qerxel Is

AI call handling and lead capture SaaS for UK sole traders and micro-businesses. The AI answers missed calls, triages intent, captures leads, refers out-of-scope callers to partners, and routes to booking or callback. The portal is the tenant's control surface.

Core sales framing — LOCKED: "Never miss another lead."

Working name — not legally confirmed yet.

**Scale intent:** Build to 500 tenants before making tech hires. Using Claude Code for all development.

---

## Tier Structure — UPDATED 2026-06-05

| Tier | Price | Concurrent | Minutes/mo |
|------|-------|-----------|------------|
| Free | £0 (PAYG £0.35/min) | 1 | 0 (PAYG) |
| Light | £29/month | 1 | 120 |
| Standard | £49/month | 1 | 250 |
| Professional | £69/month | 2 | 450 |
| Enterprise | £249/month | 3+ | 1,000 |
| Bespoke | Contact us | Custom | Custom |

Overage (subscription): Premium voice £0.18/min · Standard voice £0.14/min. PAYG: flat £0.35/min. Enterprise has NO referral network cap.

**Tier checks in code — always use this pattern:**
```javascript
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

---

## Founder

Philip Keating. 27 years running a physical manufacturing business in print, peaked at 55 staff. Strategic operator. Tech hires deliberately deferred. Uses Claude Code (VSCode extension) for all development.

Dev environment: Windows 11, VSCode, PowerShell. F12 hijacked by ASUS — uses Ctrl+Shift+I for devtools. **PowerShell does not support `&&` — always two separate commands.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Telephony | Vapi (BYOK pricing) |
| STT | Deepgram Nova-2 |
| LLM | Gemini 1.5 Flash or GPT-4o mini |
| TTS | Cartesia or Deepgram Aura |
| Database | Supabase (PostgreSQL) |
| Automation | Make.com → n8n at 30 tenants |
| Frontend | React + Vite → Vercel (auto-deploys on push) |
| SMS | Twilio |
| Payments | Stripe (not yet wired) |
| Calendar | CalDAV (Professional and Enterprise) |
| Vera AI | Claude Haiku — vera-chat + greeting-generator endpoints |

**Supabase:** https://kkrsvkxkefijmtbwykzv.supabase.co
**Anon key (HS256 — use this, NOT sb_publishable_):** in `src/supabase.js`
**GitHub:** https://github.com/philsk1/qerxel-portal
**Live URL:** https://qerxel-portal.vercel.app

---

## Visual Language — LOCKED

All inline styles. No CSS files. No CSS variables.

| Token | Value |
|-------|-------|
| Violet primary | `#5e3b87` |
| Violet dark | `#4a2d6e` |
| Violet deep | `#3a2057` |
| Amber | `#f0a500` |
| Amber text on buttons | `#1a0533` |
| Page bg | `#f7f6f9` |
| Card bg | `#ffffff` / border `0.5px solid rgba(94,59,135,0.1)` |
| Success | `#3db87a` |
| Text | `#1a1a1a` · `#666` · `#aaa` |

Fonts: Syne 700 (headings, logo, numbers). DM Sans 300/400/500 (body). Google Fonts in index.html.

Primary button: `#f0a500` bg, `#1a0533` text, borderRadius 8px.
Disabled: `#f5d98a` bg, `#7a5c1a` text.
Secondary: white bg, violet border.
Locked sections: `blur(3px)` + `opacity 0.45` + absolute white badge.

---

## Portal Structure

Shell: 64px violet header → 44px dark violet nav (amber underline on active) → `#f7f6f9` content, maxWidth 940px, padding 2rem. Default tab: Dashboard.

| Tab | File | Status |
|-----|------|--------|
| Business Profile | `BusinessProfile.jsx` | BUILT |
| AI Behaviour | `AIBehaviour.jsx` | BUILT |
| Dashboard | `ActivityDashboard.jsx` | BUILT |
| Analytics | `DataAnalytics.jsx` | BUILT |
| Partners & Referrals | `PartnersReferrals.jsx` | BUILT |
| Account | `AccountSettings.jsx` | BUILT |

**Vera help mascot:** `src/components/HelpMascot.jsx` — violet owl, bobs top of every page. Click Vera → all `[data-help]` elements pulse amber (`.vera-hover-mode` body class). Hover any to get explanation bubble. "Need more help?" button opens glowing zone mode → click zone → draggable Claude Haiku dialogue panel. Label: "Click on Vera the owl / for suggestions" (12px, `#5e3b87`, italic).

**Auth flow:** Login → Signup → Onboarding → Portal. Bidirectional guards.

---

## Database

**RLS:** ENABLED on all tables as of 2026-06-04. Script: `supabase_rls.sql`. Helper: `is_tenant_member(tid)`. HS256 anon key confirmed working with `auth.uid()`. Never switch to ES256 `sb_publishable_` key.

**Vapi webhook uses service_role key — bypasses RLS on inserts. Correct.**

Key columns added this session:
- `tenants.data_retention_days` integer default 90 — ✅ migrated

Pending migrations (not yet run):
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number text;
```

---

## Key Files

```
src/supabase.js                     — HS256 anon key
src/context/AuthContext.jsx
src/pages/Portal.jsx                — shell, nav, tab routing
src/pages/BusinessProfile.jsx
src/pages/AIBehaviour.jsx
src/pages/ActivityDashboard.jsx     — default tab
src/pages/DataAnalytics.jsx
src/pages/PartnersReferrals.jsx
src/pages/AccountSettings.jsx
src/pages/Onboarding.jsx
src/components/HelpMascot.jsx       — Vera owl + hover/zone/dialogue system
src/components/VeraDialogue.jsx     — draggable Claude Haiku chat panel
api/vapi-webhook.js                 — end-of-call handler
api/vapi-sync.js                    — patches Vapi assistant on AI Behaviour save
api/_build-prompt.js                — system prompt builder (Layer 1–3)
api/vera-chat.js                    — Vera dialogue (Claude Haiku)
api/greeting-generator.js           — greeting generator (Claude Haiku)
qerxel-handoff-V10.md             — full product spec, tier detail, AI architecture
supabase_rls.sql                    — idempotent RLS script (safe to re-run)
demo_seed.sql                       — demo data seed (safe to re-run)
src/context/DemoContext.jsx         — demo data provider (fetches demo_* tables)
src/context/PreviewContext.jsx      — enterPreview/exitPreview/isPreview for owner mode
src/pages/Calendar.jsx              — Qerxel Calendar tab (react-big-calendar, DnD, appointment modal)
src/pages/Integrations.jsx          — Integrations tab (module framework, 19 coming-soon cards)
supabase_migrations_session4.sql    — all session 4+5 migrations (run before testing Calendar/Stripe)
src/pages/DemoLogin.jsx             — demo login (/demo/login)
src/pages/BusinessSelector.jsx      — 10 business cards (/demo/select)
src/pages/TierSelector.jsx          — tier selection (/demo/tier/:id)
src/pages/DemoPortal.jsx            — demo portal shell (/demo/portal/:id/:tier)
src/pages/SalesPerformance.jsx      — aggregate rep dashboard (/demo/performance)
src/components/DemoBanner.jsx       — amber banner + inline tier switcher
```

---

## Current Build State (last updated: 2026-06-05, session 5)

### Done — Section 1
- [x] All 6 portal tabs — fully built and wired to Supabase
- [x] Auth guards — bidirectional Portal ↔ Onboarding
- [x] Visual language — full violet palette across all pages
- [x] Deployed to Vercel — auto-deploys on push to master
- [x] Vapi webhook — writes call_logs, leads, referral_log. End-to-end confirmed.
- [x] Vapi sync — patches Vapi assistant on every AI Behaviour save
- [x] System prompt builder — Layer 1 constants, tone, greeting, call rules, filters
- [x] Vera mascot — hover explains, proactive speeches, glowing zones, draggable dialogue
- [x] Tier structure — Professional £69, Enterprise £249, upgrade paths updated
- [x] Greeting architecture — tone toggle, live preview, protected modal, generator
- [x] Business outcome type — onboarding + AI Behaviour, wired to prompt builder
- [x] Urgent callback config — response mins, escalation method
- [x] Sensitive business types — minimal capture mode in prompt + webhook
- [x] Holiday mode + cover email scanning — Account tab, wired to Supabase
- [x] Provisional booking — Professional+ section, toggle + rule + slots/buffer/window
- [x] Vera speeches — first-visit speech data for all 6 tabs

### Done — Section 2 (2026-06-04)
- [x] Task 2 — GDPR: Privacy & Data section in Account tab (retention selector 30d/90d/1yr, export placeholder, delete two-stage modal, policy links). `data_retention_days` column migrated.
- [x] Task 3 — RLS enabled on all tables. `supabase_rls.sql` updated to be idempotent, added vera_speeches, vera_seen, tenant_credits, minute_usage. Confirmed live.
- [x] Vera UX — help zones pulse amber on Vera click. "Need more help?" button moved right of owl with gap. Label split two lines, 12px, violet `#5e3b87`.

### Done — Demo Session 1 (2026-06-05)
- [x] All `demo_` tables created in Supabase — demo_businesses, demo_services, demo_staff, demo_partners, demo_call_logs, demo_leads, demo_referral_log, demo_pricing_intelligence, demo_competitor_intelligence, demo_users, demo_sessions
- [x] 10 demo businesses seeded across all tiers (Light × 3, Standard × 4, Professional × 2, Enterprise × 1)
- [x] ~480 call logs (26 today + generate_series history 26 days), outcomes tuned per business type
- [x] 50 leads — mix of new/contacted/converted/lost, 2-3 actionable per business
- [x] 40 referral log entries — several today per active business
- [x] Pricing intelligence + competitor intelligence for Restore Physiotherapy (Enterprise)
- [x] demo_users: demo@qerxel.app / QERXEL2026
- [x] Seed script: `demo_seed.sql` in project root — safe to re-run

### Done — Demo Sessions 2 + 3 (2026-06-05)
- [x] `/demo` route family: login → select → tier → portal → performance
- [x] `DemoContext.jsx` — fetches demo_businesses, demo_call_logs, demo_leads, demo_referral_log, demo_services, demo_staff, demo_partners. Shapes data for all 6 tabs.
- [x] `DemoLogin.jsx` — checks demo_users table (email + access_code), stores session in localStorage
- [x] `BusinessSelector.jsx` — 10 business cards with tier badge, minutes, credits, "Platform overview" link
- [x] `TierSelector.jsx` — 4 tier cards, business's own tier flagged "Demo data", any tier selectable
- [x] `DemoBanner.jsx` — amber strip with inline Light/Standard/Professional/Enterprise tier switcher
- [x] `DemoPortal.jsx` — full portal shell, all 6 tabs live with demo data, no-op saves
- [x] All 6 tabs wired to DemoContext (useDemo() hook, isDemo guard on all saves/mutations)
- [x] `SalesPerformance.jsx` — aggregate stats across all demo businesses at `/demo/performance`
- [x] `demo_sessions` tracking — insert on every DemoPortal mount

### Done — Session 4 (2026-06-05)
- [x] Tier minutes updated: Light 120, Standard 250, Professional 450, Enterprise 1,000
- [x] Free tier (PAYG £0.35/min) — added throughout portal, onboarding, TierSelector
- [x] Overage voice preference — Premium (£0.18/min) / Standard (£0.14/min) radio in AI Behaviour
- [x] Daily PAYG cost report — api/notify-daily-cost.js, Resend email, vercel.json cron 09:00 UTC
- [x] Website scraping step 0 in onboarding — api/scrape-website.js (Firecrawl + Claude Haiku)
- [x] Plan selection step 6 in onboarding — subscription or PAYG with cost limit
- [x] Owner preview mode — PreviewContext.jsx, Portal.jsx dropdown + amber banner, all 6 tabs wired
- [x] api/owner-tenants.js — service role tenant list, email-gated
- [x] Task 5 — Support chat: api/support-chat.js (Claude Haiku + live tenant context), AccountSettings.jsx wired
- NOTE: api/support-chat.js untracked + AccountSettings.jsx unstaged — needs commit

### Done — Session 5 (2026-06-05)
- [x] Task 4 — Stripe billing: api/stripe-checkout.js + api/stripe-webhook.js + AccountSettings.jsx wired
- [x] Integrations tab — Integrations.jsx, module framework, 19 coming-soon cards
- [x] Calendar Session 1 — Calendar.jsx, react-big-calendar, DnD, appointment modal, status colours, slot warning
- [x] DB migration file — supabase_migrations_session4.sql (all new columns + appointments + staff_availability + tenant_catalogue)
- [x] QERXEL-HANDOFF-V12.md and CLAUDE.md updated

### Remaining
- [ ] Run supabase_migrations_session4.sql in Supabase SQL Editor
- [ ] Stripe setup: products/prices in Dashboard, webhook endpoint, 7 Vercel env vars (see handover)
- [ ] Calendar Session 2 — split appointments, team mode
- [ ] Task 1 — Staff extension recognition (Enterprise)
- [ ] Integration builds — Priority 1 first (Google Calendar, WhatsApp, FreeAgent, Xero, Google Business)

---

## Working Conventions

- **Commit often.** End of every session: commit, push.
- **Visual language is locked.** Check this file before adding any UI.
- **No CSS files** — all inline styles only.
- **PowerShell: no `&&`** — always two separate commands.
- **`.maybeSingle()` not `.single()`** — prevents 406 on 0 rows.
- **Supabase anon key** safe in frontend. Service role key NEVER in frontend.
- **`data-help` attributes** on all section headings and key UI elements.
- **Demo tables** prefixed `demo_`. Never join to production tables.
- **Save guards** — always `if (isDemo || isPreview || !tenantId) return` on all mutations.
- **End of session:** Update "Current Build State" above, commit, push.
