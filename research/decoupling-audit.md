# Decoupling Audit — Qerxel API Components
## Goal: each component must be self-contained and auditable as third-party software
## Method: self-consistency check + output contract check, component by component
## Live fixes applied as findings are confirmed

---

## COMPONENT 1 — AI Voice
**Files:** `api/vapi-assistant-request.js`, `api/vapi-webhook.js`, `api/vapi-sync.js`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**CRITICAL — `fetchTenantData` duplicated with column drift**
- Both `vapi-assistant-request.js` and `vapi-sync.js` defined their own `fetchTenantData`
- The sync version was missing: `speech_pace`, `speech_style`, `response_delay_seconds`, `keep_alive_topics`, `keep_alive_max_minutes`
- The live-call version fetched the entire `referral_service_map` table (no tenant filter), filtered in JS — full table scan
- **Effect:** persistent Vapi assistant (synced) and inline assistant (per-call) were built from different data. Prompt drift between what's saved and what fires on a live call.
- **Fix:** Extracted single canonical `fetchTenantData` into `api/_tenant-data.js`. Both files now import from it. Specialties query now correctly filtered by `partner_id IN (...)`.

**CRITICAL — `getVoiceConfig` duplicated with different signatures**
- `vapi-assistant-request.js` included `speed` in the voice config payload
- `vapi-sync.js` did not include `speed`
- **Effect:** Setting speech pace in the portal had no effect on the persistent assistant — only on inline calls
- **Fix:** Canonical `getVoiceConfig` in `api/_tenant-data.js`, always includes `speed`. Both files import it.

**MEDIUM — Inline `norm` function duplicated from module-level `normPhone`**
- `handleSupportCall` in `vapi-assistant-request.js` redefined phone normalisation as a local `norm` function
- `normPhone` already existed at module scope (line 111)
- **Fix:** Replaced inline `norm` with module-level `normPhone`

**MEDIUM — `callerPhone` / `callerNumber` naming collision in `vapi-webhook.js`**
- `callerNumber` declared at function scope (line 419)
- `callerPhone` re-declared mid-function (line 548) for the same value
- **Fix:** Removed `callerPhone` redeclaration; use `callerNumber` throughout. WhatsApp handler's inner `callerName` renamed `waCallerName` to avoid shadowing outer scope.

**MEDIUM — SITE_URL fallback typo in `vapi-webhook.js`**
- Two fallback URLs read `verrante-portal` (double-r) — urgent escalation email and lead notification email pointed to a broken URL
- **Fix:** Corrected to `verante-portal` to match live domain

**LOW — Supabase URL hardcoded as string literal**
- All three files had `'https://kkrsvkxkefijmtbwykzv.supabase.co'` as a bare string
- **Fix:** All now use `process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co'`

### Output contract — PASS
- `vapi-assistant-request.js` → `{ assistant: {...} }` — well-defined, consistent across normal and support paths
- `vapi-webhook.js` → `{ received: true }` (webhook) or `{ results: [...] }` (tool calls) — clean
- `vapi-sync.js` → `{ ok: true }` or `{ ok: true, created: true, assistantId: string }` — clean

### Residual note (not fixed — by design)
- `isSensitive` lookup is duplicated between `_tenant-data.js` (via fetchTenantData) and `vapi-webhook.js` (inline). The webhook looks up tenant by `vapi_assistant_id`, not `tenantId`, so it cannot reuse fetchTenantData without a schema change. Acceptable — it's one targeted query, not a drift risk.

---

## COMPONENT 2 — Chat / Vera
**Files:** `api/chat.js`, `api/_kb.js`, `api/_audit.js`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**MEDIUM — `OWNER_EMAILS_LIST` duplicated in two handlers**
- Defined identically inside `handlePolicyChat` and `handleOrchestrate` — one email change would miss the other
- **Fix:** Extracted to module-level `OWNER_EMAILS` constant. Both handlers reference it.

**MEDIUM — `handleSupport` used `m.text` instead of `m.content`**
- All other handlers use `m.content` or `m.content || m.text`. Support handler used `m.text` only — if frontend sends `content`, messages arrived as empty strings. Silent failure.
- **Fix:** Added module-level `toClaudeMessages()` helper — normalises both `content`/`text` and `ai`/`assistant` roles. All relevant handlers now use it (vera, support, q-section). Sales/bookingAssist already defensive — left unchanged.

**MEDIUM — `handleVera` and `handleQSection` passed `m.role` raw**
- Anthropic API rejects unknown roles. If frontend sends `role: 'ai'`, call would fail.
- **Fix:** Both handlers now use `toClaudeMessages()` which normalises `'ai'` → `'assistant'`.

**LOW — Supabase URL hardcoded in all three files**
- **Fix:** All now use `process.env.SUPABASE_URL ||` prefix.

**LOW — Silent audit gap in `_audit.js`**
- When `ragSearch` found a match but `meaning_map` had no twig for that file/section, the interaction was silently dropped from both the count and the log — invisible gap in the audit trail.
- **Fix:** Added `else` branch: unmapped-twig interactions now log to `q_chat_logs` so Philip can review and extend the meaning map.

### Output contract — PASS
All handlers return `{ message: string }` or `{ error: string }`. `handlePolicyChat` additionally returns `policyUpdated: bool`. `handleDemoBuild` returns `{ ok, tenantId, email, password, businessName }`. All consistent.

### Residual note (not fixed — acceptable)
- `handleDemoBuild` has no rollback on partial child-record insert failure. Acceptable for a demo flow — partial data is recoverable, auth user creation is the critical gate.
- `formatChunks` in `_kb.js` has no field validation. Acceptable — schema is internal and stable.

---

## COMPONENT 3 — Elements & Signals
**Files:** `api/_elements.js`, `api/_signals.js`, `api/_master.js`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**MEDIUM — Registry declared wrong LLM for Answer element**
- `_elements.js` listed `answer.llm = 'gemini-flash'` and included a `gemini-flash` entry in `LLMS`. Gemini is not used anywhere in the codebase — `vapi-assistant-request.js` uses `gpt-4o-mini` for all call paths. Any warden or monitoring tool reading this registry would act on false information.
- **Fix:** Corrected `answer.llm` to `'gpt-4o-mini'`. Removed the phantom `gemini-flash` entry from `LLMS`.

**LOW — `SIGNAL_TYPES` constants were advisory only — callers pass raw strings**
- `SIGNAL_TYPES` was exported but never imported by any caller. A typo in a signal type string would silently create invalid data in `system_signals` with no warning.
- **Fix:** `_signals.js` now imports `ELEMENTS` and `SIGNAL_TYPES` from `_elements.js` and emits a `console.warn` for any unknown element ID or signal type. Fire-and-forget contract preserved — validation warns, never throws.

**LOW — `isElementActive` was a dead export**
- Exported from `_master.js`, imported nowhere. Removed.

**LOW — Supabase URL hardcoded in `_signals.js` and `_master.js`**
- **Fix:** Both now use `process.env.SUPABASE_URL ||` prefix.

### Output contract — PASS
- `_elements.js`: pure data exports, no side effects. Cleanest file in the codebase.
- `_signals.js`: `emitSignal() → Promise<void>`, fire-and-forget. Double-guarded against failure.
- `_master.js`: `getMasterConfig() → Promise<config>` (never throws), `isQWriteEnabled() → Promise<boolean>`. Clean.

### Residual note
- `getMasterConfig` hits the DB on every call with no caching. Acceptable at current scale — flagged for future warden design if call frequency increases.

---

## COMPONENT 4 — Sentry
**Files:** `src/pages/Sentry.jsx`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**MEDIUM — `markReviewed` had no preview guard**
- All other mutations in the file check `previewReadOnly`. `markReviewed` did not — in owner preview mode it would write `reviewed: true` to the real tenant's variance record. Direct violation of the project-wide mutation guard rule.
- **Fix:** Added `if (isPreview || !tenantId) return` guard.

**LOW — Camera limit is UI-enforced only**
- `cameraLimit = 3` prop gates the add-camera button in JSX but nothing on the server enforces it. Acceptable at current stage. Flag for billing tier implementation.

**LOW — `testCamera` has a silent cross-component dependency**
- Calls `/api/integrations` with `action: 'sentry-snapshot'`. If that action is removed or renamed, Sentry shows "unreachable" — no indicator it's a missing handler. Logged for channel audit (Component 7 phase).

### Output contract — N/A (leaf UI component)
Sentry writes to its own DB tables (`sentry_zones`, `sentry_cameras`, `sentry_variances`) and reads `staff_profiles` as a legitimate shared read. No output contract to other components.

### Self-consistency — PASS
- All DB reads correctly scoped to `tenant_id`
- All mutations except the fixed one were already guarded
- `editorZones` and `zones` state remain in sync on add and delete
- Canvas coordinate scaling is consistent with fixed `CANVAS_W/H` dimensions

---

## COMPONENT 5 — Calendar
**Files:** `src/pages/Calendar.jsx`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**CRITICAL — `e.status` accessed on event shape that doesn't have it (two locations)**
- `toEvent()` maps appointment rows to `{ id, title, start, end, resourceId, resource: appt }` — status lives at `e.resource.status`, never at `e.status`
- `upcomingProvisional` filter (attention bar) used `e.status === 'provisional'` — always returned 0 results. Attention bar was permanently invisible even when provisional appointments existed.
- `visibleEvents` status filter used `e.status === statusFilter` — filter toggle did nothing. Since the attention bar was broken, this code path was unreachable anyway, but both needed fixing.
- **Fix:** Both changed to `e.resource?.status`

**MEDIUM — `specialist_services` field read from staff members; DB query selects `skills`**
- Staff DB query selects: `id, name, role, colour, skills, include_in_intel, overhead_hours_per_week`
- Quick-access staff panel rendered `member.specialist_services` — a field that never exists on the object
- Skill tag chips in the staff panel were permanently invisible
- **Fix:** Changed to `member.skills`

### Output contract — N/A (leaf UI component)
Calendar writes to `appointments`, `catalogue_items`, `staff_availability`, `tenants` (settings). It reads `staff_profiles`. No output contract to other components.

### Self-consistency — PASS (after fixes)
- All mutations guarded with `if (previewReadOnly ...) return` — complete audit of 10 mutation sites confirmed
- Viewport state correctly isolated to `localStorage` keyed by `tenantId`
- `handleEventDrop` uses pending-confirmation pattern; `handleEventResize` writes direct (design choice, not a bug)
- Event windowing (15-month range, extend-on-navigate) reads only the loaded tenant

### Residual notes (not fixed — by design)
- Dead state: `svcEditing` getter discarded (`[, setSvcEditing]`), `svcEditDraft` has no setter — both are clutter from an earlier inline-edit approach that was replaced by the modal. Harmless; cleanup is future housekeeping, not a bug.
- `handleEventResize` writes directly to DB without confirmation (unlike drag-and-drop which uses pending-drop banner). Acceptable — resize is a precise click-drag with immediate visual feedback; a confirmation step would be disruptive.

---

## COMPONENT 6 — Booking Page
**Files:** `src/pages/BookingPage.jsx`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**MEDIUM — `processing_start_time` absent from customer booking insert**
- `submitBooking` correctly computed `processingEnd = end + processing_minutes` and set `processing_end_time`
- `processing_start_time` was not set — DB rows from customer bookings had only the end of the processing window, not the start
- Calendar's `hasStoredSplit` requires both fields; without `processing_start_time`, customer-booked split appointments would not render the visual gap if the service was ever removed from the catalogue
- **Fix:** Added `processing_start_time: selectedService.processing_minutes ? end.toISOString() : null` to the insert payload

### Output contract — N/A (public leaf page)
Writes only to `appointments`. Fire-and-forget to `/api/integrations` for confirmation. No output contract to other portal components.

### Self-consistency — PASS (after fix)
- All tenant reads scoped to `tenantId` from URL params
- Client auth managed locally (separate from portal auth) — correct boundary for a public page
- Last-mile conflict re-query at submit time prevents race conditions
- Anon read of appointments for slot generation relies on RLS anon-read policy (set in prior session)

### Residual notes
- Slot generator blocks `duration_minutes` only — processing and completion time are intentionally free (split appointment design)
- `completion_minutes` not fetched from catalogue — slots show `duration_minutes` label, not total visit time. Acceptable at this stage; a UX improvement for a later iteration.
- `priceLabel(selectedService)` called without null guard at step 5, but `selectedService` cannot be null at that step in the flow — acceptable.

---

## COMPONENT 7 — Portal Shell
**Files:** `src/pages/Portal.jsx`
**Status:** COMPLETE — all findings fixed, deployed 2026-06-19

### Findings & fixes

**MEDIUM — Sentry PIN gate had a content flash: protected content briefly visible before PIN fetched**
- `sentryPin` initialises as `undefined`; lazy-fetch fires only when tab is first opened
- Gate condition required truthy `sentryPin` — while undefined (fetching), gate was skipped and SentryTab rendered unprotected
- Inner `if (sentryPin === undefined)` loading spinner was dead code: unreachable inside a block requiring truthy `sentryPin`
- **Fix:** Changed outer condition from `sentryPin &&` to just `!sentryUnlocked`, then inside: `if (sentryPin === undefined)` → show loading, `if (sentryPin)` → show gate. SentryTab never renders until PIN state is resolved.

**MEDIUM — `toggleQDisplay` wrote to real tenant DB in preview mode**
- Computed `tid = preview.isPreview ? preview.previewTenantId : tenantId` — in preview, would write `q_display_on_screen` to the previewed tenant
- No preview guard — only Q Live Session banner visibility protects this, not a code guard
- **Fix:** Added `if (preview.isPreview) return` as first line; simplified `tid` to just `tenantId`; updated `useCallback` deps accordingly

**LOW — `hasListen` passed twice to `PortalSidebar`**
- Lines 576 and 595 both passed `hasListen={hasListen}` — harmless (React uses last value) but indicates a stale prop from an earlier interface change
- **Fix:** Removed the duplicate at line 595

### Output contract — N/A (root shell component)
Portal is the application root — it owns routing between tabs, preview state, and subscription. No output contract to other components.

### Self-consistency — PASS (after fixes)
- Tab state persisted to localStorage keyed by tab ID — no tenant data in keys
- Q Live Session subscription scoped to correct `tid` — preview-aware
- PIN gate now holds content until DB state is confirmed
- All mutations in sub-components receive `tenantId` and `previewReadOnly` via props — Portal itself only mutates `sentry_pin` (via SentryPinGate) and `q_display_on_screen` (via toggleQDisplay), both now guarded
- `SentryPinGate.handleReset` uses client-side email/name validation — acceptable: user is authenticated at that point and `user.email` is always present

### Residual notes
- `handleNotifChange → saveNotification` from `useTenantState` — mutation guard assumed to be in the hook; not audited here (outside this component's boundary)
- `lockedProduct` click-capture interceptor is a non-standard interaction pattern (prevents interactive elements in locked tabs from firing) — acceptable for the upsell flow, but brittle if new interactive elements are added to locked tabs without testing

---

## CHANNEL AUDIT — Cross-component data flow
**Scope:** API action/type routing, shared context preview-awareness, prop contract consistency
**Status:** COMPLETE — one broken caller found and fixed

### Channel 1 — `/api/integrations`
All frontend callers verified against handler map:

| Action | Caller | Handler |
|--------|--------|---------|
| `connect` | Integrations.jsx (×4) | inline ✓ |
| `disconnect` | Integrations.jsx | inline ✓ |
| `caldav-sync` | Calendar.jsx (×3) | `handleCaldavSync` ✓ |
| `send-welcome` | Onboarding.jsx | `handleSendWelcome` ✓ |
| `send-review` | Calendar.jsx | `handleSendReview` ✓ |
| `booking-confirm` | BookingPage.jsx, Calendar.jsx | `handleBookingConfirm` ✓ |
| `sentry-snapshot` | Sentry.jsx | `handleSentrySnapshot` ✓ |
| `get-booking` | ManageBooking.jsx | `handleGetBooking` ✓ |
| `cancel-booking` | ManageBooking.jsx | `handleCancelBooking` ✓ |

All 9 actions matched. No orphaned callers.

### Channel 2 — `/api/chat`

**MEDIUM — `ClientDirectory.jsx` sent wrong shape — AI draft was permanently broken**
- Called `/api/chat` with `{ mode: 'vera-chat', message, history }` — no `type` field, no `messages` array
- `chat.js` router reads `const { type } = req.body` — unknown type falls through to `res.status(400).json({ error: 'Unknown type' })`
- `d.reply || d.message || ''` resolved to `''` — draft button appeared to work but always produced empty text
- **Fix:** Changed to `{ type: 'vera', zoneText: 'SMS campaign drafting...', zoneName: 'clients', tabName: 'clients', messages: [{ role: 'user', content: '...' }] }`

Remaining callers:

| Type | Caller | Handler |
|------|--------|---------|
| `vera` | VeraDialogue.jsx, ClientDirectory.jsx (fixed) | `handleVera` ✓ |
| `support` | AccountSettings.jsx | `handleSupport` ✓ |
| `booking-assist` | BookingPage.jsx | `handleBookingAssist` ✓ |
| `intel` | CalendarIntelligence.jsx | `handleIntel` ✓ |
| `orchestrate` | MasterControl.jsx | `handleOrchestrate` ✓ |
| `sales` | SalesChat.jsx | `handleSales` ✓ |
| `demo-build` | SalesChat.jsx | `handleDemoBuild` ✓ |
| `policy-chat` | SupportIntelligence.jsx | `handlePolicyChat` ✓ |

All 8 types matched after fix.

### Channel 3 — API file existence
All 8 API endpoints called from frontend confirmed present:
`/api/chat`, `/api/integrations`, `/api/freeagent`, `/api/export-data`, `/api/vapi-sync`, `/api/notify`, `/api/admin`, `/api/ground-zero`

### Channel 4 — `useTenantState` preview awareness
- Tier flags (`listenTier`, `calendarTier`, `baseTier`, `sentryCameraLimit`) reload from preview tenant via second `useEffect` when `preview.previewTenantId` changes ✓
- `tenantId` intentionally stays as owner's real ID — Portal.jsx derives `activeTenantId = preview.isPreview ? preview.previewTenantId : tenantId` and passes it to all tab components ✓
- `saveReturnDate` and `saveNotification` both guard with `if (!tenantId || preview.isPreview) return` ✓
- `uncontactedCount` not preview-aware (shows owner's count in preview) — minor UX imprecision, acceptable

### Channel 5 — `PortalSidebar` tenantId inconsistency
- Sidebar receives real `tenantId` (not `activeTenantId`) — this was flagged as a suspected inconsistency
- Verified harmless: `tenantId` is used only for a localStorage key (`qerxel_sb_sections_${tenantId}`)
- Both `useState` init and the `useEffect` that reloads on `tenantId` change short-circuit with `if (isPreview) return {}` — localStorage path is never hit in preview mode ✓

---

*Audit started: 2026-06-19*
*Channel audit completed: 2026-06-19*
*Method: self-consistency + output contract per component, live fixes applied*
