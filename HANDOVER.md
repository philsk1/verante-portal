# QERXEL — NEW MACHINE HANDOVER
## Read this before starting any session on a new computer.

---

## 1. NEW MACHINE SETUP CHECKLIST

### Step 1 — Clone the repo
```
git clone https://github.com/philsk1/verante-portal
cd verante-portal
npm install
```

### Step 2 — Create the .env file
Create `C:\Users\philo\Documents\verante-portal\.env` with:
```
SUPABASE_PAT=<your Supabase Personal Access Token>
```
The PAT is found in: Supabase dashboard → Account → Access Tokens.
This is used for direct SQL via the management API. Never commit this file.

### Step 3 — VS Code + Claude Code
- Install VS Code
- Install the **Claude Code** extension (Anthropic)
- Sign in with your Anthropic account — subscription carries over automatically
- **Re-select your model**: Claude Code → Settings → Model. Select Opus or whichever you were using. This is not synced automatically.
- Open the `verante-portal` folder in VS Code

### Step 4 — Copy memory files (optional but recommended)
From the old machine, copy the entire folder:
```
C:\Users\philo\.claude\projects\C--Users-philo\memory\
```
To the same path on the new machine. This preserves cross-session context about Philip's preferences, project history, and feedback.

If the new machine has a different username, the path changes — recreate the memory files manually using the session summaries in CLAUDE.md.

### Step 5 — Deploy command
All deployments use:
```
NODE_OPTIONS=--use-system-ca npx vercel deploy --prod
```
The `NODE_OPTIONS` flag is required for Node 24 on Windows (TLS CA fix).
Vercel CLI will prompt for login on a fresh machine — `npx vercel login`.

---

## 2. CRITICAL CONSTANTS — NEVER CHANGE THESE

- **Supabase project ID:** `kkrsvkxkefijmtbwykzv`
- **Live URL:** `https://verante-portal.vercel.app`
- **GitHub:** `https://github.com/philsk1/verante-portal`
- **Owner email:** `finsolsoffice@gmail.com`
- **Anon key:** in `src/supabase.js` — this is the HS256 key. Never use the `sb_publishable_` key.
- **API limit:** 12/12 Vercel Hobby — AT CAPACITY. No new API files without consolidating first.

---

## 3. THE FOUR LOCKED RULES

1. **All styles are inline.** No CSS files. No CSS variables. Ever.
2. **`.maybeSingle()` not `.single()`** — prevents 406 errors on 0 rows.
3. **Save guard on every mutation:** `if (previewReadOnly || !tenantId) return`
4. **HS256 anon key only** — never the `sb_publishable_` ES256 key.

---

## 4. COMPLETE CONFIRMED PRICING — LOCKED

All prices confirmed from conversation history. Do not change without Philip's explicit instruction.

### Answer (AI call handling)

| Tier | Price | Minutes/mo | Concurrent |
|------|-------|-----------|-----------|
| Free (PAYG) | £0 | 0 (35p/min) | 1 |
| Light | £29/mo | 120 | 1 |
| Standard | £49/mo | 250 | 1 |
| Professional | £69/mo | 450 | 2 |
| Enterprise | £249/mo | 1,000 | 3+ |
| Bespoke | Contact us | Custom | Custom |

Overage: Premium £0.18/min · Standard £0.14/min · PAYG flat £0.35/min

### Schedule (Calendar)

| Tier | Price | Rule |
|------|-------|------|
| Entry | Free | Always included with any purchase |
| Multi-staff | £5/mo + £2/staff | Per additional staff member |
| Enterprise/Bespoke Answer | Included | Multi-staff bundled — no extra charge |

Gate: Entry = single operator only. Multi = team columns, staff view, full scheduling.

### Listen (Live call copilot)

| Tier | Price |
|------|-------|
| Standard | 3p/min of live call |
| Advanced | 4p/min of live call |

Requires Answer (cannot stand alone — needs telephony infrastructure).
Fixed monthly fee: ~£10/mo — **PENDING CONFIRMATION** from Philip.

### Sentry (Station monitoring)

| Cameras | Monthly |
|---------|---------|
| Up to 3 | £20/mo |
| Up to 5 | £25/mo |
| Up to 7 | £30/mo |
| Up to 9 | £35/mo |

Add-on to Schedule. Requires Schedule for booking reconciliation.
Language rules: NEVER say "revenue leak", "theft", "surveillance". ALWAYS say "service reconciliation", "booking accuracy", "data variance".

---

## 5. CONFIRMED FEATURE LIMITS — LOCKED

All limits confirmed from conversation history.

### Staff per tier (StaffDirectory.jsx)

| Tier | Limit |
|------|-------|
| Free | 1 |
| Light | 3 |
| Standard | 8 |
| Professional | 15 |
| Enterprise / Bespoke | Unlimited |

### SMS Campaign recipients per month (ClientDirectory.jsx)

| Tier | Recipients/month |
|------|-----------------|
| Free | 0 — sees data, cannot send |
| Light | 100 |
| Standard | 500 |
| Professional | 2,000 |
| Enterprise | Unlimited |

### Service catalogue items (ServiceCatalogue.jsx)

| Tier | Services |
|------|---------|
| Free | 5 |
| Light | 20 |
| Standard | 60 |
| Professional | 200 |
| Enterprise | Unlimited |

### Product catalogue items (ProductCatalogue.jsx)

| Tier | Products |
|------|---------|
| Free | 5 |
| Light | 30 |
| Standard | 100 |
| Professional | 400 |
| Enterprise | Unlimited |

---

## 6. CURRENT BUILD STATE (as of 2026-06-12)

### Fully working
- Auth: signup → onboarding → portal (bidirectional guards)
- All 11 portal tabs + 3 Business tabs wired to Supabase
- Owner preview mode (read-only + edit mode toggle)
- Vapi call handling end-to-end (webhook → call_log → leads → notifications)
- AI prompt builder (layers 1-3, catalogue, staff extension recognition)
- Calendar: full team calendar, DnD, viewport modes, staff columns
- Sentry: tile dashboard (stations, staff→stations, cameras, activity, variances)
  - DB migration done: camera_id nullable, staff_profile_id added
- Schedule-only dazzle nav (special PRODUCTS nav, Answer upsell strip)
- Account & Billing product showcase (4-product grid, active/inactive states)
- Sidebar ⌘K command palette (grouped, keyboard nav)
- Q scoring system (QScoreContext, three-pillar, coaching panel)
- SMS campaign composer (tier-gated, STOP handling, GDPR compliant)
- Client Directory, Service Catalogue, Product Catalogue
- GDPR: opt-out, deletion, CSV export
- 41 demo tenants seeded (Meridian Hair & Beauty = full demo business)
- Portal.jsx refactored: PortalIcons.jsx + useTenantState.js hook

### Pending — in order
1. Wire campaign recipient limits (Light=100, Standard=500, Pro=2000, Ent=∞) into ClientDirectory.jsx
2. Wire catalogue limits (above table) into ServiceCatalogue.jsx + ProductCatalogue.jsx
3. Confirm Listen fixed monthly fee (~£10/mo) then add to PlanSelector
4. Sentry polling/ingestion engine (deferred — needs real camera URLs from owners)
5. Listen multi-term search
6. UX audit: collapsible settings sections
7. AI Behaviour link in owner admin page
8. Investigate Blackwood Restoration staff linking issue in DB

---

## 7. KEY FILE LOCATIONS

| What | Where |
|------|-------|
| Project truth document | `CLAUDE.md` |
| This handover | `HANDOVER.md` |
| Portal shell | `src/pages/Portal.jsx` |
| Portal icons | `src/pages/PortalIcons.jsx` |
| Tenant state hook | `src/hooks/useTenantState.js` |
| Plan / pricing selector | `src/pages/PlanSelector.jsx` |
| Account & Billing | `src/pages/AccountSettings.jsx` |
| Calendar | `src/pages/Calendar.jsx` |
| Sentry | `src/pages/Sentry.jsx` |
| Owner selector | `src/pages/OwnerSelector.jsx` |
| Client Directory | `src/pages/ClientDirectory.jsx` |
| Q score context | `src/context/QScoreContext.jsx` |
| Supabase client | `src/supabase.js` |
| All API endpoints | `api/` (12 files — AT CAPACITY) |
| Memory files (local) | `C:\Users\philo\.claude\projects\C--Users-philo\memory\` |

---

## 8. DATABASE QUICK REFERENCE

- **Project:** `kkrsvkxkefijmtbwykzv`
- **SQL access:** `POST https://api.supabase.com/v1/projects/kkrsvkxkefijmtbwykzv/database/query`
  with `Authorization: Bearer <SUPABASE_PAT>`
- **Always use Node.js** for SQL queries — curl fails on Windows/Node 24
- **RLS enabled** on all tables. Owner bypass already applied (`supabase_owner_rls.sql`)
- `callers` table uses `full_name` column — NOT `name`
- `sentry_zones.camera_id` is nullable (migration run 2026-06-12)
- `sentry_zones.staff_profile_id` exists (migration run 2026-06-12)

### Key tables
`tenants` · `tenant_memberships` · `staff_profiles` · `staff_availability` · `appointments` · `catalogue_items` · `leads` · `callers` · `call_logs` · `referral_partners` · `referral_service_map` · `sentry_cameras` · `sentry_zones` · `sentry_variances` · `campaigns`

---

## 9. PRODUCT ARCHITECTURE (one-paragraph summary)

Three products. **Answer** (AI call handling, standalone) and **Schedule** (calendar, standalone — the market entry Trojan horse) are the two pillars. **Listen** (live call copilot) augments either but cannot stand alone. **Sentry** (station monitoring + booking reconciliation) is a Schedule add-on. The portal is the control surface for all four. Owner preview mode lets Philip log in as any tenant. Scale intent: 500 tenants before any tech hire. All development via Claude Code.

---

*Generated: 2026-06-12. Cross-reference with CLAUDE.md for full task history.*
