# QERXEL — TASKS & KNOWN ISSUES
## Completed work, active issues, next tasks, pending decisions

---

## Active known issues

**IC-16: setState-in-effect violations**
Multiple files call setState synchronously inside useEffect body → cascading renders.
Files: HelpMascot.jsx, AIBehaviour.jsx, AccountSettings.jsx, PlanSelector.jsx, StaffDirectory.jsx, Onboarding.jsx.
Low priority unless performance issues arise.

**IC-17: Missing useEffect dependencies**
AIBehaviour, PartnersReferrals, StaffDirectory, OwnerSelector, OwnerAudit, PlanSelector, Onboarding.
Usually intentional (avoid re-run on navigate ref change). Review before treating as bugs.

---

## Completed work (summary by date)

### 2026-06-11
IC-01–06, IC-08, IC-12–13 fixed — product gating correct throughout.
Calendar viewport (Open/Compact toggle, staff stepper, arrow keys, drag-reorder, localStorage).
AI Foundation tab (annotated guardrails, computed voice, config summary).
Sidebar nav rebuild (product-grouped, collapsible).
Dead code sweep (IC-07, IC-09–15, IC-18).
Business data pages (ClientDirectory, ServiceCatalogue, ProductCatalogue).
BusinessProfile dead code fixed. Keep-alive topics (AI Settings, prompt injection).
Meridian demo fully seeded (Professional, 280 calls, 45 clients, full catalogue).
All 41 tenants seeded (callers, call_logs, leads, products). Meridian partners seeded.
Owner preview Edit mode. Live/Away toggle removed. Holiday mode removed.
Booking link button in Calendar toolbar. History search multi-term fix.
Meridian products + 63 upcoming appointments seeded.

### 2026-06-12
Q scoring system (QScoreContext, three-pillar score, HelpMascot mood).
ProductCatalogue previewReadOnly fix. Staff gating per tier + PlanSelector lines.
Owner selector Q score (face + score per card, perf sort).
Account & Billing added to sidebar. Q coaching panel (pillar bars, 5 action points, red badge).
Listen live copilot UI mode. Schedule standalone nav (dazzle nav).
Booking customer fields. PlanSelector "Schedule" rename.
Sentry built (5 DB tables, canvas zone editor, variance dashboard, Q-guided wizard).
Portal hooks bug fixed. Portal.jsx Option C refactor (PortalIcons, useTenantState, 1046→490 lines).
Account & Billing → silent salesperson. Sidebar sitemap / ⌘K command palette.
Calendar stacking fix (vpOpen default 5→10).

### 2026-06-13
Q Mood system redesigned: one Q per page, HelpMascot IS the mood Q. Inline QMood panels deleted.
Per-page mood mapping. Dismissal decay. All 4 moods PNG. Performance score 50/50 blend.

### 2026-06-14 (continued)
Visual design overhaul: sidebar #5e3b87 → #140c2a (deep navy), logo border opacity raised, active tab bg → amber tint, section headers brighter. Sticky 52px page title bar added to all tabs (Syne 700, excluded from Listen). OwnerSelector header matched to sidebar. Q Intelligence cards + OwnerSelector business cards shadow-enhanced.
Ground Zero: all 44 calendar tenants fully reseeded — proper sector services, products (hair/beauty/dental/fitness/grooming/wellness), tiered appointment density (excellent→struggling), zero overlaps. Ground Zero button added to OwnerSelector with progress modal; data-density sort added (richest/lightest); appointment count chip on each card. freeagent-invoice + freeagent-oauth consolidated → freeagent.js (freed API slot). Listen tab scroll fixed (wrapper div missing flex:1 broke height chain).

### 2026-06-14 (session 3)
Live desk full redesign: 2-column collapsed call grid replacing old copilot layout. Each card expands to show action bar (Call via tel: link, Message with sms: pre-populated, Book → Calendar), message compose panel, AI summary, transcript bubbles. Service edit modal + services panel removed. Lead count discrepancy fixed (ActivityDashboard now uses all-time uncontacted count). Q layout on Listen corrected to match other pages (normal 136px Q in top header, Live desk full width).

### 2026-06-18
Voice ID fix (complete): vapi-assistant-request.js `aura-luna-en`→`luna`, `aura-stella-en`→`stella` (lines 27, 32, 608). vapi-sync.js sales demo outbound `aura-luna-en`→`luna`. All Deepgram endpoints now use correct short-form IDs. Needs deploy.
CLAUDE-PROCEDURES.md: written and perfected — 10 audit findings applied. Universal ethical overlay, conflict resolution priority, domain definition, caller as stakeholder, cross-references, authority boundary middle tier, CLAUDE-OBJECTIONS.md reference, review mechanism, visible output requirements.
Marketplace audit written to research/marketplace-audit.md — seven-tier evaluation, procedure compliance findings, 6 recommended next actions.

### 2026-06-16 (session 3)
Q display toggle: q_display_on_screen boolean added to tenants (DEFAULT true). Portal.jsx: qDisplayOnScreen state + qDisplayRef (stale-closure safe), initial load on Q session subscription, Realtime handler checks ref before switching tabs or applying highlights. "Q is in session" banner updated with "Move to background / Show on screen" button. AIBehaviour.jsx: q_display_on_screen added to select, initialised from tenant, saveQDisplayOnScreen(), toggle UI added at bottom of Voice & Pace section.
Business type auto-detection in SalesChat: handleSales in chat.js instructs Q to append [BIZ:sector] tag when sector is identified. SalesChat.jsx parses and strips tag from displayed message, stores detectedBizType in state, pre-fills modal bizType field with note "Q matched from your conversation" when auto-detected.
Demo builder architecture agreed: ephemeral tenant cloned from best-matching sector tenant + AI-renamed. Prospect can interact (changes real). "End demo" resets + redirects to /signup. Offer: keep for next visit (cookie) or see own details (onboarding). Light email capture at end-demo moment. Context from chat triage passed to demo call Q via metadata. Next session build.

### 2026-06-16 (session 2)
**Q Live Session**: Q navigates the tenant's portal in real time during a support call — two architecturally separate channels enforced ("THE WALL"): Voice (what Q says, warm, human, never technical) and Engine (tool calls, DB writes, portal navigation — silent, invisible). supabase_q_live_session.sql executed: q_session_active, q_session_tab, q_session_highlight, q_draft_instructions columns added to tenants + realtime enabled. Portal.jsx: Realtime subscription updates active tab and shows "Q is in session" banner when q_session_active. AIBehaviour.jsx: Realtime subscription highlights Voice & Pace section; draft instructions panel displays q_draft_instructions live. vapi-assistant-request.js: buildSupportTools() (8 tools: read_ai_setup, navigate_portal, set_think_time, set_voice_pace, set_communication_style, draft_ai_instructions, save_ai_instructions, end_session), TOOL USE PROTOCOL block injected into support system prompt with TENANT_ID. vapi-webhook.js: executeTool() + handleToolCalls() + tool-calls event branch. MasterControl.jsx: data-help attributes on all 6 cards. HelpMascot: command tab added.
**Q Sales Demo**: Q answers as Qerxel's own sales agent, walks prospect through the product in a 5-minute call, then demos as a matched demo business when prospect gives their sector. vapi-sync.js: handleSalesDemoOutbound — outbound call with inline assistant (buildSalesDemoPrompt + buildSalesDemoTools) using VAPI_SALES_PHONE_NUMBER_ID. vapi-webhook.js: select_demo_tenant tool (keyword match against all tenants) + end_demo_mode tool. chat.js: handleSales handler (type: 'sales' — public, no tenantId, uses QERXEL_KNOWLEDGE + RAG). SalesChat.jsx: public chat page at /try-q — Q Chat + "Hear Q live" button → modal (phone + business type) → outbound call trigger. App.jsx: /try-q public route. Deployed.

### 2026-06-16
Element architecture seed built: system_signals table (Supabase, live), master_config table (Supabase, live — service_role REVOKE enforced at DB level). api/_elements.js: formal element registry (Answer/Support/Q/Schedule/Listen with LLM, policy source, authority, warden slot). api/_signals.js: fire-and-forget emitter. api/_master.js: read-only master config reader for all elements and Q. vapi-webhook.js: emits 'answer'/'call_completed' + 'support'/'call_support_done' after each call. chat.js: emits 'q'/'chat_turn' after each vera/support/policy-chat turn. chat.js handlePolicyChat: Q write authority check via isQWriteEnabled() — if suspended by master_config, Q cannot execute update_support_policy tool. admin.js: warden snapshot function (reads system_signals, computes per-element health, emits warden_snapshot signal) + GET ?type=warden handler for daily cron. vercel.json: warden cron added (daily midnight). MasterControl.jsx: owner-only control panel — system state (live/maintenance/emergency), Q write authority toggle, per-element status (active/suspended/inactive), last warden snapshot with stress flags, live signal feed. Wired into Portal.jsx + PortalSidebar.jsx. Policy chat "talk to Q about this policy" feature also completed this session.
KB RAG: kb_chunks table created in Supabase (FTS via tsvector GENERATED column + GIN index). match_kb_chunks() Postgres function. scripts/index-kb.cjs indexes all 25 KB files (285 chunks total) by H2 section. api/_kb.js: ragSearch() + formatChunks() helpers. chat.js handleVera: runs ragSearch on last user message, injects top-4 relevant chunks into system prompt. Deployed.
Q Audit infrastructure: q_chat_logs table, q_brief table (v1.0 seeded), q_audits table, q_aggregate_signals view, q_chat_patterns view. api/_audit.js: logChatTurn() fire-and-forget. chat.js handleVera + handleSupport log every turn. Deployed.
Meaning Map: meaning_map table (trunk → 6 branches → 285 twigs seeded from kb_chunks). q_audit_samples table (1-in-20 compliance samples). increment_meaning_count() Postgres function (atomic weight increment). _audit.js rewritten — count not store: matched interactions increment twig weight, unmatched stored in q_chat_logs. admin.js handleMeaningMap: returns tree with weights + unmatched interactions. MasterControl.jsx: Meaning Map panel — branch bars with interaction weight, top twigs, unmatched queue. Deployed.

### 2026-06-15 (session 3)
Full support line system built: SQL migration (support_calls, support_policy, incidents, compensation_log). vercel.json updated to bundle knowledge-base/ with API functions (includeFiles). vapi-assistant-request.js: support call detection via VAPI_SUPPORT_PHONE_NUMBER_ID — identifies tenant by caller phone vs business_phone, loads full KB from filesystem, builds support system prompt with GPT-4o + complaint procedure + policy. vapi-webhook.js: support call post-processing — writes to support_calls, fires WhatsApp + email escalation to Support leadership on Category A or requires_escalation. admin.js: 4 new owner actions — support-dashboard (all calls, incidents, policy), support-policy-save (upsert policy row), incident-create, incident-resolve (auto-calculates 10x compensation per tenant by tier, generates compensation_log rows). SupportIntelligence.jsx: owner-only dashboard with support call log (expandable, category/frustration badges, filter by category), incidents panel (log new / mark resolved with auto-compensation), policy editor (plain English, free minutes, max strikes, escalation contacts). Wired into Portal.jsx + PortalSidebar.jsx (owner email gate — visible only to finsolsoffice@gmail.com). KB-TECH-DATABASE.md updated with 4 new tables. CLAUDE-SCHEMA.md updated.

### 2026-06-15 (session 2)
"Test your AI" card added to AIBehaviour.jsx: dark purple card at bottom of AI settings, phone number input, "Call me now" button, calling/success/error states. Uses tenant's actual configured Vapi assistant (not generic demo) when assistantId is available.
Sync status feedback in AIBehaviour: "Syncing AI…" → "AI updated ✓" chip visible after any AI settings save. Replaces silent fire-and-forget.
vapi-sync.js: handleDemoCall extended to accept assistantId — uses assistantId field in Vapi call body when provided (caller hears real AI, not inline generic). Auto-create path: when tenant has no vapi_assistant_id, the sync endpoint now POSTs a new assistant to Vapi and saves the returned ID to tenants table (was 400 before).
Onboarding.jsx handleFinish: fires vapi-sync after account creation (fire-and-forget) to auto-create Vapi assistant for every new tenant.
ActivityDashboard.jsx: "Before you go live" readiness checklist panel — 7 items (AI assistant created, phone number assigned, business name, opening hours, contact name, AI instructions, catalogue items). Collapsible, auto-hides when all green. Navigation buttons link directly to the relevant settings tabs. Preview booking page link included.

### 2026-06-15
Greeting system full rewrite: canonical greeting structure locked (frustration removal + legal note + personal agency). Greeting coaching removed from QScore and AIBehaviour. buildGreeting() exported from _build-prompt.js — single source of truth used by both vapi endpoints. greeting_message field repurposed as addendum only. greeting-generator.js repurposed for addendum phrases only. Sector variations built into buildGreeting() with isSensitive sealed greeting for legal/medical. Negative LLM constraints added to LAYER_1_CORE_VALUES. Trades pricing discipline hard-coded into system prompt.
Business Desk tab built (BusinessTab.jsx): four sections — Our Team (staff cards with call/text/email), Services & Products (catalogue with supplier picker + one-click order email), Suppliers (full CRUD, linked products), Phone Book (merged contacts). suppliers table created. supplier_id added to catalogue_items via management API. Wired into Portal.jsx renderTab, PAGE_TITLES, TAB_CONTEXT. IcoDesk icon added to PortalSidebar.
Marketing intelligence search + Contacts layer: ClientDirectory.jsx rebuilt with unified contacts (callers + booking clients merged by phone), behavioral segments (Ritual/Explorer/Lapsed computed from appointments), tier-gated search depth (entry=3mo, multi=12mo), segment filter tabs + insight explanation bars, Call/Text quick-links on every contact card. campaign_targets excludes booking-only contacts from opt-out/hot-prospect mutations (no caller_tenant_relationship row).
product_url field: added to catalogue_items via management API. ProductCatalogue.jsx updated — add form includes URL input, card shows clickable ↗ Link badge when set. Used by Listen Pro catalogue hand-off (future).

### 2026-06-14
Sidebar redesign (green/blue dots, all sections collapsible, upsell modal, localStorage).
AIBehaviour.jsx crash fix. Forensic audit (IC-20–25) — 35 lint errors eliminated.
Sentry: 4-digit PIN gate, sidebar visibility, purchase path, PIN management in AccountSettings.
Blackwood staff linking (IC-24 + IC-25). QScoreContext staff_availability query fixed.
Schedule standalone: ScheduleAnalytics.jsx, ManageBooking.jsx, cancel_token, booking-confirm emails.
PortalSidebar: Answer upsell strip + hasScheduleMulti Team lock. SQL migrations via management API.
HelpMascot tabCoachMap completed (services + referrals entries).
QScoreContext: Answer coaching suppressed for schedule_only tenants.
ScheduleAnalytics critical bug fixed (tenantId never resolving).
ManageBooking: reschedule button for future appointments.
All 43 demo tenants fully seeded (staff, availability, catalogue, appointments).
Sterling Recruitment duplicates cleaned (staff 20→4, catalogue 24→6).
Dead code deleted: QMood.jsx, src/hooks/useQScore.js (both never imported).
Radiant Beauty Clinic: 185 appointments, 3 staff, 7 priced services, Tue–Sat, 20% online.
Booking page: Qerxel discovery card on confirmation (step 5). Free/paid/professional+ tiers.
Booking page branding: brand_colour, logo_url, booking_promo_text, booking_promo_expires_at, hide_qerxel_ad columns added. AccountSettings "Booking page" section built. Brand colour + logo applied throughout booking page. Service search (fuzzy, word-split, shows for >4 services). Wider layout on step 5. Ad copy: "Booking service provided free by Qerxel business software."
CLAUDE.md split into 6 domain files.
SITE_URL env var confirmed live on Vercel. Fallback typo fixed (verrante→verante) and deployed.
Schedule tier markers confirmed: Entry free/1col, Solo £19/1col/250msg, Small Team £29/4col/500msg, Growth £39/8col/1000msg, Large £49/20col/2000msg.
Listen tier markers confirmed: Listen £10/100mins/3p overage, Listen Pro £20/250mins/4p overage.
CLAUDE-PRODUCTS.md updated with both tier tables.
PlanSelector updated: calendar column counts + message allowances + search depth correct; Listen tiers renamed (Listen/Listen Pro) with base prices (£10/£20) and minute bundles.
HelpMascot Q PNG sizes reduced 20% (170→136, 155→124, 68→54).
Calendar auto-adapt weekend fix: 3+ staff day-view now lands on Friday if today is Sat/Sun.
Q Intelligence tab added to DataAnalytics.jsx: Revenue Evaporation, At-Risk Clients (Fragility), Behavioural Segments (Ritual/Explorer/Lapsed), Staff Intelligence. Sub-tab switcher visible for Answer+Schedule tenants. Schedule-only tenants land directly on Q Intelligence. All cards follow WHAT/WHY/WHAT TO DO format.

---

## Next tasks

0. ~~**Demo builder**~~ — DONE 2026-06-16. Ephemeral tenant clone (best-sector-match → AI-renamed), isDemoMode flag throughout portal (banner, end-demo modal, Account & Billing hidden, PortalSidebar End Demo button). End-demo modal: "Keep exploring" or "Build my real business" → signOut → /signup. SalesChat /try-q: "Explore the portal" button → POST demo-build → signInWithPassword → /portal. Warden cleans expired ephemeral tenants daily.
   **Known gap**: `?sector=` param from end-demo modal is not consumed by Signup.jsx or Onboarding.jsx. Onboarding subcategory pre-fill requires string→UUID matching against business_type_subcategories table — non-trivial. Flag for future session when onboarding is being reviewed.
1. **VAPI_SUPPORT_PHONE_NUMBER_ID** — Philip must: (a) provision a dedicated Vapi phone number for the support line, (b) add `VAPI_SUPPORT_PHONE_NUMBER_ID` to Vercel env vars with the Vapi phone number ID. Without this, support line detection won't trigger.
2. **Run supabase_support_tables.sql** — Philip must run this SQL file in Supabase SQL editor to create support_calls, support_policy, incidents, compensation_log tables. File: [supabase_support_tables.sql](Documents/verante-portal/supabase_support_tables.sql)
2a. **system_signals + master_config** — DONE. Both tables live in Supabase. master_config seeded with system row. service_role REVOKE applied.
3. **System map** — Philip wants a map of everything built (too complex to hold in my head). Not yet actioned.
4. **VAPI_DEMO_PHONE_NUMBER_ID** — Verify this env var is set in Vercel. Without it, the "Test your AI" call returns 503. Philip needs to check Vercel env vars or add a Vapi demo phone number.
5. **Philip's tenant: vapi_phone_number is null** — Blocking real inbound calls. Philip must add a Vapi phone number and assign it to the tenant (via Vapi dashboard → Phone Numbers → assign to assistant).
6. ~~KB embedding + RAG~~ — DONE 2026-06-16. 285 chunks, Postgres FTS, injected into handleVera.
8. **PlanSelector billing update** — update tier IDs to new naming when Stripe billing is active (BLOCKED — awaiting Stripe setup)
9. **AccountSettings UX audit** — group infrequently-used sections (Privacy & Data, Feedback, Danger Zone) into collapsible wrappers to reduce page length. Low priority — 1606-line file, careful touch needed.
10. **Listen Pro tier** — add `listen_tier = 'pro'` handling when billing is active. `product_url` field on catalogue_items is already in place for the hand-off feature.
11. **Contacts: caller_tenant_relationship for booking-only contacts** — booking-only contacts currently can't be starred as hot-prospect or opted-out (no relationship row). Add relationship support for phone-keyed contacts.

---

## Pending owner actions

### Q Sales Demo phone number
Add `VAPI_SALES_PHONE_NUMBER_ID` to Vercel env vars — provision a dedicated Vapi phone number for outbound sales demo calls. Without this, the "Hear Q live" call returns 503. The demo AI assistant is built inline (no saved assistant ID needed).

### Stripe (not yet active)
Create products/prices in Stripe dashboard → set webhook to `https://verante-portal.vercel.app/api/stripe-webhook` → add 7 env vars to Vercel.

### Third-party OAuth
FreeAgent + Xero: create dev OAuth apps, add client ID/secret to Vercel env vars.

### Appointment reminders
Set up n8n/Make.com to POST `/api/notify?type=remind` hourly with `Authorization: Bearer <CRON_SECRET>`.

### Listen pricing
Confirm pricing: ~£10/mo + 3-4p/min. Update PlanSelector when confirmed.

### Product naming
Confirm Vera's permanent name. Confirm new tier names/prices when ready to update portal.

---

## Demo tenant reference

**Radiant Beauty Clinic** — `8d565933-39d1-449d-b0d5-76fee5839b22`
Primary demo business: 185 appointments, 3 staff, 7 services with prices, Tue–Sat, 20% online.

**Meridian Hair & Beauty** — Professional tier
280 calls, 45 clients, 177 leads, 3 staff, 5 referral partners, 63 upcoming appointments.

**Sterling Recruitment** — `0f92ebc2-a8da-4f90-ae54-b8ec5849e215`
4 staff, 6 catalogue items, 70 appointments.

All 43 tenants have staff, availability, catalogue items, and meaningful appointment counts.

---

## Supabase SQL files run (for reference)

- [supabase_owner_rls.sql](Documents/verante-portal/supabase_owner_rls.sql) — owner RLS bypass (13 tables)
- [supabase_staff_availability_owner_rls.sql](Documents/verante-portal/supabase_staff_availability_owner_rls.sql) — staff_availability RLS for owner
- [supabase_cancel_token_migration.sql](Documents/verante-portal/supabase_cancel_token_migration.sql) — cancel_token UUID on all appointments
- [supabase_upgrade_multi_staff_tiers.sql](Documents/verante-portal/supabase_upgrade_multi_staff_tiers.sql) — 29 tenants upgraded to multi-staff
- [supabase_sentry_pin.sql](Documents/verante-portal/supabase_sentry_pin.sql) — sentry_pin column added
- [supabase_suppliers.sql](Documents/verante-portal/supabase_suppliers.sql) — ✅ 2026-06-15 — suppliers table + supplier_id on catalogue_items
- [supabase_support_tables.sql](Documents/verante-portal/supabase_support_tables.sql) — ✅ 2026-06-15 — support_calls, support_policy (7,301 char policy seeded), incidents, compensation_log
