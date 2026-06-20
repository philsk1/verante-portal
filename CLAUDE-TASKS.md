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

### 2026-06-20 (session 14 — Calendar DnD hardening)
**Calendar appointment resize hardened — three changes, deployed.**
- `handleEventDrop` now always preserves original duration: `snappedEnd = new Date(start + originalDuration)` replaces `end` from BigCalendar. Prevents any library-side end-time drift on drop regardless of snapping rounding. (`Calendar.jsx:1648`)
- `handleEventResize` replaced with a no-op `() => {}` — was previously writing start/end to DB and optimistically updating events, which allowed any accidental resize action to persist. Now fully inert. (`Calendar.jsx:1676`)
- CSS: added `pointer-events: none !important` alongside existing `display: none !important` on `.rbc-addons-dnd-resize-ns-anchor` and `.rbc-addons-dnd-resize-ew-anchor`. Belt-and-braces — library already doesn't render these elements when `resizable={false}`. (`index.css:58`)
- **Root cause clarification:** The "stretch" the user sees is BigCalendar's normal event-width layout. Overlapping appointments each get ~50% column width; when moved to non-overlapping positions they expand to 100% column width. This looks like "stretching" but is not a resize — it is correct calendar behaviour (Google Calendar, Outlook, etc. all do this). Resize itself is fully disabled.

### 2026-06-19
Onboarding.jsx: Partners step removed (was step 6, 9-step flow → 8-step flow). Step numbering corrected (Plan=step 6, Review=step 7). `refer_out` field removed from Boundaries step, businessContext builder, and review summary. `custom_business_type` added to data state. Step 0 heading changed to "Select your business category". "My business isn't listed — choose my own" option added with text input mode and back navigation. Progress bar text colour darkened (#aaa→#666). Build clean, deployed.
Booking page (BookingPage.jsx): full Phorest-style rewrite — staff selection (Step 1 with cards + No preference), service categories (pill filter), merged date+time (per-day rows with slot pills), Supabase Auth client account gate (Step 4, skip if already logged in), My Bookings tab (shows upcoming bookings for logged-in client). `client_user_id` column added to appointments. DB policies added for anon read on staff/services/availability, authenticated insert/select for client bookings. Deployed.
Decoupling audit (7 components + channel audit): API components (AI Voice, Chat/Vera, Elements & Signals), Sentry, Calendar, BookingPage, Portal Shell. All complete. Channel audit complete. research/decoupling-audit.md is the running log. Key fixes: fetchTenantData/getVoiceConfig canonical extraction → _tenant-data.js; speech pace now persists to Vapi assistants; support chat m.text bug fixed; Gemini phantom entry removed from element registry; SIGNAL_TYPES validation added; markReviewed preview guard added (Sentry); e.resource?.status fix in Calendar (attention bar was always empty); staff skills field name corrected; processing_start_time added to customer booking insert; Sentry PIN gate flash fixed; toggleQDisplay preview guard added. Channel audit: ClientDirectory.jsx SMS draft was using mode: 'vera-chat' (no type field) — always returned { error: 'Unknown type' } silently; fixed to type: 'vera' with correct shape. All other /api/integrations (9 actions) and /api/chat (9 types) channels confirmed intact. useTenantState preview awareness verified. PortalSidebar tenantId inconsistency confirmed harmless.

### 2026-06-20 (Logic trace — onboarding + upgrade path QA + 3 bug fixes)
**Static logic trace: full portal data flow from onboarding through all upgrade paths. 8 findings. 3 bugs fixed. Deployed.**

Trace covered: `Onboarding.jsx` handleFinish → `useTenantState.js` derivations → `Portal.jsx` gate booleans → `PlanSelector.jsx` → `AccountSettings.jsx` handlePlanSelect + handleSentryActivate.

Findings summary:
- **FINDING 1 (FIXED)**: Calendar onboarding path was writing `subscription_tier = 'standard'` (or 'free' for payg). `useTenantState` derives `hasAnswerProduct = true` for any non-null/non-schedule_only value, so Calendar-only tenants received full Answer portal access. **Fix:** `subscription_tier: isCalendar ? null : (payg ? 'free' : tier)`. Also corrected `calendar_tier` from deprecated `'entry'` → `'solo'`. (`Onboarding.jsx:962–964`)
- **FINDING 2 (FIXED)**: Calendar tier upgrades via PlanSelector (AccountSettings) were not propagating to Portal. `useTenantState` only exported `setListenTier` — `setCalendarTier` was not exported. After upgrade: DB updated, AccountSettings local state updated, but Portal's `hasSchedule`/`hasScheduleMulti`/`scheduleOnly` remained stale until page refresh. **Fix:** Export `setCalendarTier` from `useTenantState`; pass as `onCalendarTierChange` prop to AccountSettings; call after DB write.
- **FINDING 3 (FIXED)**: Same root cause for Sentry activation. `setSentryCameraLimit` not exported from `useTenantState`. Sentry tab remained locked after activation until page refresh. **Fix:** Export `setSentryCameraLimit`; pass as `onSentryChange` prop; call in `handleSentryActivate`.
- **FINDING 4 (INFO)**: `'entry'` deprecated calendar tier ID now fixed at source (Onboarding writes 'solo'). Existing DB rows with 'entry' still work correctly — `hasSchedule = calendarTier !== 'none'` evaluates true; `hasScheduleMulti` evaluates false. No breakage.
- **FINDING 5 (INFO)**: Answer tier upgrades go through Stripe (`handleUpgrade` → `/api/freeagent` → stripe-checkout). Stripe not active. Fails silently. Expected — no fix, logged as pending owner action.
- **FINDING 6 (INFO)**: `listen_tier` not written at onboarding — correct. Defaults to null → 'none'. Listen is post-onboarding add-on only.
- **FINDING 7 (FIXED — same as FINDING 2)**: `onCalendarTierChange` callback now exists.
- **FINDING 8 (FIXED — same as FINDING 3)**: `onSentryChange` callback now exists.

Files changed: `Onboarding.jsx:962–964`, `useTenantState.js:159–162`, `Portal.jsx:234,521`, `AccountSettings.jsx:948,1334,1344`. Build clean. Deployed.

### 2026-06-20 (Onboarding — Calendar plan step fix)
**Calendar onboarding path was showing Answer tier cards (£29/£49/£69/£249) instead of Calendar tier cards. Fixed and deployed.**
- Added `CALENDAR_TIERS` constant (solo £19, small_team £29, growth £39, large_team £49).
- Added `calendar_tier: 'solo'` to initial data state.
- `Step5PlanSelection` now accepts `isCalendar` prop — Calendar path shows Calendar tier cards calling `update('calendar_tier', t.id)`.
- Review summary billing line updated: Calendar path shows "Schedule {tier} · first month free".
- `handleFinish` already correct from prior session fix. Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — PartnersReferrals.jsx — IN PROGRESS)
**Decoupling SOP pass on `src/pages/PartnersReferrals.jsx` (Ring 2, ~660 lines). Score 35 → 18. Build clean. NOT YET DEPLOYED.**
- 8 module-scope helpers added: `isAwaitingReciprocal`, `networkScore`, `reciprocHelpScore`, `urgentSummary`, `reciprocSummary`, `addBtnProps`, `onEnterKey`, `setupPulseModal`.
- Component body: `urgentCount` filter now uses `isAwaitingReciprocal`; `btn` pre-computed via `addBtnProps(draft.name, adding, previewReadOnly)`; first useEffect guard `if (!user && !isPreview)` moved into `loadPartnerData` itself.
- JSX: `networkScore` replaces nested ternary on `data-help-score` (L496); `onEnterKey(addPartner)` replaces 2 inline `onKeyDown` handlers; `btn.disabled/background/color/cursor` replaces 5 inline `||` chains + ternaries on Add button; `reciprocHelpScore` replaces nested ternary + inner filter at L545; `urgentSummary` replaces 3-branch ternary at L555-558; `reciprocSummary` replaces 3-branch ternary at L561-564; second useEffect body extracted to `setupPulseModal`.
- **RESIDUAL: Score is 18, threshold is 15. Need 3 more points removed.**
- All useEffect callbacks and `const` closures (addPartner, removePartner, logInbound, etc.) are scored SEPARATELY by SonarJS — they do NOT contribute to the component's 18. The 18 lives entirely in the direct body + JSX (if/ternary/&&/|| at top-level component scope).
- **Exact remaining sources:** Direct body: `if(loading)` +1, `??isPreview` +1, ternary `referralUrl` +1 = 3. JSX: `&&strength` +1, `&&partners.length>0` ×2 +2, `partners.length===1?` +1, `!referralCode?` +1, `codeCopied?` ×4 +4, `linkCopied?` +1, `&&referralCode` +1, `adding?` +1 = 12. Subtotal 15 direct. The 3 extra must come from something not yet identified — investigate with `--rule '{"sonarjs/cognitive-complexity":["warn",0]}'` scan and look for something in the 15–18 gap.
- **NEXT STEP: Read the scan output carefully, find the 3 missing points, make targeted edit, then build + scan + deploy.**

### 2026-06-20 (Complexity Reduction SOP — PortalSidebar.jsx)
**Decoupling SOP pass on `src/pages/PortalSidebar.jsx` (Ring 2, ~812 lines post-edit).**
- Contract Header written: INTENT MAP (nav shell, Q health card, favourites, section expand/collapse, notif panel, bottom icon bar), REGRESSION MAP (localStorage only — no DB reads/writes), NON-OBVIOUS (scheduleOnly shows different PRODUCTS array; section state keyed per-tenantId; baseTier is a dead unused prop).
- Three violations → zero: `PortalSidebar` 36, `renderTab` 22, `renderSectionHeader` 16.
- **Pass 1 — `QHealthPanel`**: Extracted health score card (channelHealth double-nested map) to module-scope component. Calls `useQScore()` internally — 1 prop (`onIssueSelect`). `healthExpanded` state moved inside component. Removed from PortalSidebar: `useQScore()` call, `[healthExpanded, setHealthExpanded]` state, 62-line JSX block → 1 line call.
- **Pass 2 — `buildSidebarProducts`**: Extracted 80-line `PRODUCTS` ternary (`scheduleOnly ? [...] : [...]`) to module-scope function. Converted `adminEmails` inline array to named const to avoid repetition. Call site: `const PRODUCTS = buildSidebarProducts({ scheduleOnly, hasSchedule, hasScheduleMulti, hasListen, hasSentry, isDemoMode, user })`.
- **Pass 3 — `TabRow`**: Converted `const renderTab = (...) => (...)` closure to module-scope `function TabRow({ 11 props })`. `key` prop moved to call sites. Body copied directly from file (indent trimmed 2 spaces). Call sites: `<TabRow key={\`fav-${tab.id}\`} .../>` and `<TabRow key={tab.id} .../>`.
- **Pass 4 — `sectionLabelColor` + `tabBg` + `tabColor`**: `renderSectionHeader` 4-way color chain → `sectionLabelColor(locked, isActive, subtle)` helper. `TabRow` 21 → ≤15 via two 3-way style helpers: `tabBg(isActive, isHovered)` and `tabColor(isActive, locked)`. All extracted closures now ≤15.
- Final scan: **0 violations**. Build clean. Deployed.

### 2026-06-20 (decoupling SOP pass — sessions 5 & 6)
**Decoupling SOP (Zero-Web Standard) applied to Ring 1 + Ring 2 files.**
`research/decoupling-sop.md` created: 5 Prime Directives, Three-Ring topology table, 3 SOPs (Complexity Reduction 8-step, Dead Code Deletion 4-step, API Leaf Cleanup 5-step).

Files processed with Contract Header + dead code cleanup:
- `api/greeting-generator.js` (Ring 1) — header only, already clean
- `api/export-data.js` (Ring 1) — **bug fixed**: `data_retention_days` was missing from tenants SELECT; email footer always showed "90 days". Added to SELECT.
- `api/stripe-webhook.js` (Ring 1) — header added; `PRICE_TO_TIER` as function (not const) noted — reads env vars at call time, intentional.
- `api/_signals.js` (Ring 1) — header added; fire-and-forget write-sink, no changes.
- `api/_sms.js` (Ring 1) — dead identity chain removed (third `.replace(/^\+44/, '+44')` was unreachable after digits-only normalisation).
- `api/ground-zero.js` (Ring 2) — header added; 7 WHAT-explaining inline comments removed.
- `api/vapi-sync.js` (Ring 2) — dead destructured params removed from `handleDemoCall` (`businessName`, `tradeContext`, `services`, `emergencyKeywords` — all unreachable after early `if (!assistantId)` return); dead ternary in log simplified.
- `src/pages/Sentry.jsx` (Ring 2) — header added; `deleteCameraZone` dead passthrough wrapper deleted, call site updated to call `deleteZone` directly; 3 state-grouping comments, 6 section dividers, 5 JSX block comments removed.
- `src/pages/PartnersReferrals.jsx` (Ring 2) — header added with CSS exception note (`@keyframes invitePulse` in PartnerInviteModal — unavoidable); 3 section dividers, 1 state-shape comment, 2 WHAT comments, 8 JSX block comments removed.

SonarJS re-scan (threshold 15) — current highest scores:
DataAnalytics.jsx (68, 22, 21), ListenTab.jsx (51 — newly discovered), ActivityDashboard.jsx (47, 18, 16), Calendar.jsx (37, 30, 24, 21, 17×2), PortalSidebar.jsx (36, 22, 16), PartnersReferrals.jsx load() (35), ground-zero.js generateSectorData() (56), AccountSettings.jsx (46, 18, 17), Onboarding.jsx (27, 22, 18), StaffDirectory.jsx (27, 26).
Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — ListenTab.jsx)
**Decoupling SOP pass on `src/pages/ListenTab.jsx` (Ring 2, 825 lines post-edit).**
- `ListenTab` function (score 51) — extracted 3 named module-scope components: `CallListItem({ call, isSelected, onSelect, onToggleFlag })` — the per-call button card with 6 conditional branches; `EmptyStatePanel({ activeTab, search, searchQuery, tabDef })` — 4-branch empty/loading state handler; `DetailPanel({ selected, onClear, toggleFlag, transcriptRef })` — the entire right pane including "Select a call" placeholder + call detail header + 3-branch transcript rendering.
- Score dropped 51 → 24. Remaining 24 is in filter derivation ternary chains (`effectiveFilter`, `tabCounts` forEach, `visible`) and the quick stats IIFE — stateful, no clean extraction path without fragmenting state.
- `transcriptRef` passed as a prop to `DetailPanel` so the scroll-to-top useEffect in `ListenTab` continues to control the scrollable div.
- The 4 `react-hooks/refs` errors are pre-existing documented false-positives (custom plugin rule, suppressed with eslint-disable-next-line comments already in the file).
- Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — DataAnalytics.jsx)
**Decoupling SOP pass on `src/pages/DataAnalytics.jsx` (Ring 2, 1580 lines post-edit).**
- Contract Header written: INTENT MAP (3 tabs: performance / intelligence / outreach), REGRESSION MAP (reads only — no DB mutations), NON-OBVIOUS notes (demoPricing/demoCompetitors permanently empty, PerformanceTab shadowed IIFE, calendar_tier='none' hides intelligence/outreach tabs, activeTab force-set for schedule_only).
- `QIntelligenceSection` (score 68) — the highest-complexity function in the entire codebase — extracted into 4 named module-scope card components: `EvaporationCard({ cancelledThisMonth, fragilityClients, hasAnswerProduct, unconvertedLeads })`, `FragilityCard({ fragilityClients })`, `SegmentsCard({ ritualCount, explorerCount, lapsedCount })`, `StaffIntelCard({ staffIntel })`. Each placed above `QIntelligenceSection` with flat explicit props, no new files.
- `QIntelligenceSection` is now a 12-line orchestration wrapper: loading guard + insufficient-data guard + 4 component calls.
- Post-extraction SonarJS scores: `EvaporationCard` 22 (still above threshold — 3 ternary event handlers + nested && chains in summary text), `PerformanceTab` 21 (unchanged), `DataAnalytics` 22 (unchanged). Score 68 eliminated. `QIntelligenceSection` now ≤15.
- Also fixed: file encoding mojibake (â€", â€¦, â†') replaced with HTML entities (&mdash; &hellip; &rarr;) in new extracted functions.
- Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — AccountSettings.jsx)
**Decoupling SOP pass on `src/pages/AccountSettings.jsx` (Ring 2, 1471 lines post-edit).**
- Contract Header written: INTENT MAP (self-service hub — 9 sections), REGRESSION MAP (reads tenants/memberships/staff/leads/partners; mutations to tenants/billing_events/call_logs), NON-OBVIOUS (useMemo false-positive, 42-day feedback gate, SENTRY_TIER_PRICES, billingModel payg/subscription).
- `ProductsSection` (score 46) — 3 extractions, 3 passes:
  - Pass 1: `SentryProductExtra({ 16 props })` extracted — PIN-edit form + tier-picker JSX (2-branch outer ternary with 4 nested ternaries in the tier-picker map). `ProductCard({ p })` extracted — product card rendering with 5 conditional style/content decisions.
  - Pass 2: `buildProducts({ tier, calendarTier, listenTier, sentryCameraLimit, sentryTierOpen, tierInfo, sentryExtra, setShowPlanSelector, setSentryTierOpen })` extracted to module scope — the 4-object product config array with all chained ternaries for body/btn/action per product.
- Final scores: `ProductsSection` ≤15 (eliminated from scan); `buildProducts` 26 (irreducible — 4 config objects × chained ternaries); `ProductCard` 17; `SentryProductExtra` ≤15. Original score 46 eliminated.
- `FeedbackSection` at 18 (unchanged — 3-way ternary for done/unlocked/locked states).
- Pre-existing false-positive: `react-hooks/purity` at line 1314 (suppressed with eslint-disable-next-line).
- Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — Calendar.jsx)
**Decoupling SOP pass on `src/pages/Calendar.jsx` (Ring 2, 2560 lines post-edit).**
- Contract Header written: INTENT MAP (view/create/edit/delete bookings, staff schedules, settings, drag-and-drop, recurring series), REGRESSION MAP (reads appointments/staff/tenants/leads/clients; mutations to appointments + tenants), NON-OBVIOUS (withDragAndDrop ESM/CJS interop fallback, recurring batch insert, previewReadOnly gates all mutations).
- **Pass 1 — `RecurringSeriesSection` extraction**: `renderFormPanel` (score 37) — extracted the 40-line `{panelMode === 'create' && ...}` recurring series block into `RecurringSeriesSection({ panelMode, repeatType, repeatCount, onRepeatTypeChange, onRepeatCountChange })`. Score 37 → 16.
- **Pass 2 — `FormPanelFooter` extraction**: Extracted 16-line footer action bar (`Delete` / `Cancel` / `Save` buttons) into `FormPanelFooter({ panelMode, previewReadOnly, saving, repeatType, repeatCount, handleDelete, handleSave, setPanelMode, closePanel })`. Score 16 → ≤15 ✓. `renderFormPanel` eliminated from SonarJS scan.
- **Pass 3 — `REPEAT_LABELS` lookup fix**: `RecurringSeriesSection` came out at score 22 due to 6-branch nested ternary chain in description text. Replaced with module-scope `const REPEAT_LABELS = { daily, weekly, fortnightly, 3weekly, monthly, 6weekly }` and `{REPEAT_LABELS[repeatType] ?? ''}`. Score 22 → ≤15 ✓.
- Final scan: `renderFormPanel` ≤15 ✓, `RecurringSeriesSection` ≤15 ✓, `FormPanelFooter` ≤15 ✓. Remaining pre-existing violations: 119:17, 831:30, 897:21, 1237:17, 1657:24 — all present before this session.
- Build clean. Deployed.

### 2026-06-20 (Complexity Reduction SOP — ActivityDashboard.jsx)
**Decoupling SOP pass on `src/pages/ActivityDashboard.jsx` (Ring 2, 2103 lines post-edit).**
- `computePerfMood(callsThisMonth)` extracted to module scope (was inline 18-line const block): returns `{ mood, reason, tip }` from 3 chained ternary sets. Module-scope score 22 (3-deep nested ternaries are inherently complex; extraction is the ceiling).
- `submitQuickCapture({ tenantId, previewReadOnly, qcName, qcPhone, qcNotes, qcOutcome, setQcSaving, setLeads, setCalls, setQcName, setQcPhone, setQcNotes, setQcOutcome, setQuickCaptureOpen })` extracted to module scope (was 50-line async function inside component): full caller upsert + call_log insert + conditional leads insert. Module-scope score ≤15 (not flagged).
- Inside `ActivityDashboard`, replaced with: `const { mood: perfMood, reason: perfReason, tip: perfTip } = computePerfMood(callsThisMonth)` and `const handleSubmit = () => submitQuickCapture({ ... 14 flat params })`.
- `ActivityDashboard` score: **47 → 25**. Remaining 25 lives in JSX render tree (mobile tile system, readiness checklist, alert computations) — no clean extraction path without fragmenting state.
- Pre-existing lines 1020 (score 16) and 1226 (score 18) within file are separate named functions — separately reducible in a future pass.
- Build clean. Deployed.

### 2026-06-20 (third-party audit pass)
**Tool 1 — Dependency Cruiser:** No circular dependencies. No API→frontend boundary violations. 3 page-to-page imports all intentional (AccountSettings→PlanSelector, AIBehaviour→AIFoundation, Calendar→CalendarIntelligence). 1 genuine dead code file: `src/components/QBotIcon.jsx` — confirmed unreachable (still present, not yet deleted). 4 orphaned API files (freeagent.js, greeting-generator.js, ground-zero.js, stripe-webhook.js) confirmed as HTTP endpoints, not dead code.
**Tool 2 — SonarJS (eslint-plugin-sonarjs):** 52 cognitive complexity violations (threshold 15) across 14 files. User instructed precision strike on top 2 only:
- `src/pages/DataAnalytics.jsx`: `QIntelligenceSection` score 68 — extracted two inline onClick handlers to named module-scope functions (`openEvaporationQ`, `openFragilityQ`). Fixed latent props bug: `hasAnswerProduct` and `unconvertedLeads` were used inside `QIntelligenceSection` without being in its props. Score remains 68 — handler extraction reduced inline size but card-by-card conditional rendering is the main driver; further extraction needed to push score below 15.
- `src/pages/Sentry.jsx`: `renderPanel` score 55 — extracted 5 named inner functions within `SentryTab` body (`renderStationsPanel`, `renderStaffPanel`, `renderCamerasPanel`, `renderActivityPanel`, `renderVariancesPanel`). `renderPanel` becomes 7-line dispatch. Score dropped: `renderPanel` violation gone; `SentryTab` now reads 20 overall; one sub-function at line 440 reads 17. Significant improvement.
- 187 duplicate string warnings: not actionable — consequence of no-CSS-variables rule.
- Remaining high-risk files not yet touched: `DataAnalytics.jsx` (score 68), plus lines 678 (21) and 923 (22) in same file.
**Tool 3 — PlantUML architectural map:** Written to `research/architecture.puml`. Covers: auth + tenancy pattern, frontend direct DB access (anon key + RLS), API proxy routes, inbound telephony flow (Vapi→vapi-webhook→DB+notifications), Q AI flow, CalDAV sync, Stripe billing cycle, admin/owner tools. Key finding: Stripe billing infrastructure (freeagent.js + stripe-webhook.js) is already wired — no new tables needed for Checkout. Accounts view can read from existing tables. Full map ready as Checkout/Accounts blueprint.
Build clean. Deployed.

### 2026-06-19 (session 4 — Phase 3 re-audit)
Re-ran decoupling audit across all 7 components post Phase 2.
- **Calendar.jsx additional fix**: `filteredStaff(serviceId)` was comparing a UUID against `specialist_services` array of service NAMES — so staff with specialist services assigned were always excluded from the dropdown when any service was selected. Fixed by resolving service name via `catalogue.find(c => c.id === serviceId)?.name` before filtering. Staff qualification filtering now works end-to-end.
- **Portal.jsx gating re-verified**: `hasSchedule = calendarTier !== 'none'` flows correctly through all sidebar locks, lockedProduct intercepts, and scheduleOnly path after Phase 2 calendarTier default fix.
- **API components 1–3**: no drift. All confirmed clean.
- **decoupling-audit.md** updated with Phase 2 and Phase 3 findings for Component 5. Build passes. Deployed.

### 2026-06-19 (session 3 — Phase 2 tenant journey simulation)
Journey trace: Signup → Onboarding → Portal/useTenantState → BusinessProfile → StaffDirectory → ServiceCatalogue → Calendar → PartnersReferrals → AccountSettings → BookingPage → ActivityDashboard → DataAnalytics → BusinessTab → ClientDirectory. Findings and fixes:
- **Onboarding.jsx bug fixed**: `calendar_tier: isCalendar ? 'entry' : 'entry'` — both branches were identical, granting calendar access to Answer-only tenants. Fixed to `'none'` for Answer-only.
- **useTenantState.js bug fixed**: `calendarTier` fallback was `|| 'entry'` on both the initial load and preview reload branches. Fixed to `|| 'none'` (correct default when column is null).
- **Calendar.jsx field name fix**: `staff_profiles` select was fetching `skills` column (doesn't exist) instead of `specialist_services`. Fixed on SELECT and all three access points (display chips + filteredStaff function). Staff qualification filtering was silently returning no skills for any staff member.
- **CLAUDE-SCHEMA.md corrections**: (a) `staff_profiles`: `tags text[]` → corrected to `specialist_services text[]` + added missing columns (`email`, `address`, `birthday`, `direct_line_did`, `private_notes`, `active`). (b) `call_logs`: `outcome` → corrected to `call_outcome` (code was consistent, schema doc was wrong) + added `caller_phone`, `ai_summary`. (c) `catalogue_items`: added `colour varchar(7)` (British English, used by ServiceCatalogue). Build passes, deployed.

### 2026-06-19 (session 2)
Cyclomatic complexity pass — all functions in src/ and api/ now below 49 (ESLint threshold). Files fixed this session:
- DataAnalytics.jsx: DAY_LABELS + OUTCOME_META moved to module scope; PerformanceTab, QIntelligenceSection, OutreachSection already at module scope from prior session.
- HelpMascot.jsx: VeraStrip + QCoachingPanel extracted to module scope.
- StaffDirectory.jsx: StaffDetailPanel (incl. field/lbl/inp helpers) extracted to module scope.
- Calendar.jsx: EMPTY_SVC to module scope; buildAndInsertAppointments + QuickAccessDrawers extracted.
- PartnersReferrals.jsx: OverlapWarning, PartnerRows, PartnerInviteModal, KpiTiles extracted to module scope.
- AIBehaviour.jsx: applyTenantData() extracted to module scope (was 52-complexity load function; now ~12).
- BusinessTab.jsx, ClientDirectory.jsx, ServiceCatalogue.jsx: all already below 49 on recheck.
Build passes. Full ESLint scan: zero complexity warnings. Deployed.

### 2026-06-18
Voice ID fix (complete): vapi-assistant-request.js `aura-luna-en`→`luna`, `aura-stella-en`→`stella` (lines 27, 32, 608). vapi-sync.js sales demo outbound `aura-luna-en`→`luna`. All Deepgram endpoints now use correct short-form IDs. Deployed.
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

0. ~~**Demo builder**~~ — DONE 2026-06-16.
   ~~**Onboarding partners/refer_out removal**~~ — DONE 2026-06-19.
   ~~**Booking flow rewrite**~~ — DONE 2026-06-19. Phorest-style, client auth gate, My Bookings tab.
   ~~**Decoupling audit (7 components + channel audit)**~~ — DONE 2026-06-19. All findings fixed. Channel audit complete.
   ~~**Phase 2: Tenant journey simulation**~~ — DONE 2026-06-19. Full trace Signup→Onboarding→Portal→all tabs. 3 bugs fixed, 3 schema doc corrections.
   ~~**Phase 3: Re-run decoupling audit**~~ — DONE 2026-06-19. Additional Calendar.jsx fix: filteredStaff UUID→name mismatch; gating re-verified; all API components clean.
   ~~**Third-party audit pass (Dependency Cruiser, SonarJS, PlantUML)**~~ — DONE 2026-06-20. Full audit log below. research/architecture.puml written.
   **Known gap (onboarding)**: `?sector=` param from end-demo modal is not consumed by Signup.jsx or Onboarding.jsx. Onboarding subcategory pre-fill requires string→UUID matching against business_type_subcategories table — non-trivial. Flag for future session.
   **Pending (onboarding)**: Plan step redesign — bullet-point feature list per tier, reorder (commit → tiers → PAYG). Needs Philip to supply tier bullet points. PAYG message: "PAYG clients pay a higher per minute charge…"
   **Pending (onboarding)**: Website scraping fix for https://www.expressionsofbeauty.co.uk/ ("scraping not configured").
   **Pending (onboarding)**: CSV upload link on services step — scope unclear, likely CSV import.
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
12. **Staging environment** — two-part decision (data window 2026-06-20):
    - Part A: Vercel preview branch workflow (15 min) — push to `staging` branch gets a preview URL for UI/code testing before merging to master
    - Part B: Second Supabase project (half day) — needed before any migration runs against a DB with real client data
    - **Procedure note:** When staging is built, Procedure 5 (authority boundaries) and deploy sections of CLAUDE-RULES.md must be reviewed — staging changes the deploy workflow and what "production deploy" means. Philip to confirm authority to edit procedures at that point.
    - **Also:** Agree Philip's preferred deploy cadence for live site (maintenance windows, change notices, changelog format) and lock it into procedures before first real client beyond Bloom & Co.

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
