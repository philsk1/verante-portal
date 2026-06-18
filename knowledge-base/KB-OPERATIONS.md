# Operations — How Philip Runs the Business

## What this document covers

This is Layer 3 of Q's knowledge base — the operational layer. It documents how Philip Keating (the founder and sole operator of Qerxel) actually runs the business day-to-day. This is not product documentation. It is the institutional memory of how the service is delivered, how clients are onboarded, how problems are resolved, and what has been learned about running an AI-powered SaaS as a solo founder.

Anyone using Q to understand how to do something in the Qerxel business — not just how to use the portal — should find the answer here.

---

## Founder context

Philip Keating. 27 years in manufacturing before pivoting to tech entrepreneurship. Not a developer — uses Claude Code (Anthropic's AI CLI tool, running as a VSCode extension on Windows 11) to build the entire product. Every line of code is AI-assisted. Philip does the product thinking, testing, and business decisions; Claude Code does the implementation.

This means the product develops fast and is driven by clear business logic, not engineering convention. If you are a developer or future AI working on this codebase, read CLAUDE.md first — it tells you how sessions work and what the non-negotiable rules are.

Philip's operating model: build every feature to serve the client as the only engineer. Target 500 tenants before any tech hire. AI tools are the team.

---

## How a new client is onboarded

### Step 1 — Signup (client does this)
Client visits verante-portal.vercel.app and clicks Sign Up. They enter their email and create a password via Supabase Auth. This creates a Supabase auth user and fires the Onboarding flow.

### Step 2 — Onboarding wizard (client does this, Firecrawl assists)
The onboarding wizard collects:
- Business website URL (optional) — Firecrawl scrapes this and Claude Haiku extracts business name, description, and service list
- Business name, business type, approximate service list
- Plan selection (pricing tier)
- Basic AI preferences

At completion, the wizard creates:
- A row in `tenants` with the business details
- A row in `tenant_memberships` linking the auth user to the tenant
- A Vapi assistant (via vapi-sync) — `tenants.vapi_assistant_id` is populated
- A schedule entry calendar (calendar_tier = 'entry') if Schedule was selected

### Step 3 — Phone number provisioning (Philip does this manually)
This is the one step that cannot be automated without purchasing Vapi phone numbers programmatically. Philip:

1. Logs into Vapi dashboard
2. Purchases a UK phone number (01/03/07 prefix)
3. Notes the phone number (E.164 format, e.g. +441234567890) and its Vapi UUID (the phoneNumberId)
4. Goes to Supabase dashboard (or uses management API via SUPABASE_PAT)
5. Updates the tenant's row:
   ```sql
   UPDATE tenants
   SET vapi_phone_number = '+441234567890',
       vapi_phone_number_id = 'vapi-uuid-here'
   WHERE id = 'tenant-uuid-here';
   ```
6. Confirms with the client that their number is live

### Step 4 — Call forwarding setup (client does this)
Philip sends the client their Qerxel number and a one-page instruction sheet for their mobile network's call forwarding code. The most common UK codes:

- **EE/BT/Plusnet:** `**61*[Qerxel number]#` (no answer) / `**62*[Qerxel number]#` (switched off) / `**67*[Qerxel number]#` (busy)
- **O2:** Same codes
- **Vodafone:** Same codes
- **Three:** Same codes (sometimes `*21*[number]#` for full divert)
- **Landline/VoIP:** Provider must configure this on their end — call provider and ask for conditional call forwarding to the Qerxel number

**Testing:** Ask the client to call their own number from another phone while the main phone is off or busy. Q should answer.

### Step 5 — Portal setup (client does this, Philip monitors via OwnerSelector)
Client fills in:
- Business Profile (name, hours, context, contact name, booking link)
- Services / Catalogue
- AI Behaviour (tone, call type rules, additional instructions)
- Staff (if multi-person)

Philip can monitor setup completion via the OwnerSelector dashboard at `/owner/select`. The dashboard shows a readiness indicator per tenant.

### Step 6 — First test call (client does this)
Client uses the "Call me now" button in AIBehaviour. Q calls their mobile using the demo phone number (`VAPI_DEMO_PHONE_NUMBER_ID`). This confirms the system is working end-to-end.

### Step 7 — Go live (client does this)
Client enables call forwarding. First real calls start coming in.

---

## How to access any tenant's portal (OwnerSelector)

Navigate to: `https://verante-portal.vercel.app/owner/select`

This only works when logged in as finsolsoffice@gmail.com.

The OwnerSelector shows all tenants sorted by performance (Q score, appointment count, call volume, subscription value). Click any tenant to enter their portal in preview mode.

**Preview mode — two submodes:**
- **Read-only (default):** Browse as if you are the tenant. No changes can be made. All save buttons are blocked.
- **Edit mode:** Toggle in the preview banner. Changes are made on the tenant's behalf. Use only when helping a client fix a configuration issue.

To switch tenant without exiting: click "Change" in the preview banner.
To exit preview: click "Exit preview" in the preview banner.

---

## How to troubleshoot a tenant whose Q isn't answering calls correctly

Step-by-step diagnostic:

1. **Check the phone number is assigned.**
   In Supabase (or via OwnerSelector → tenant row): `vapi_phone_number` and `vapi_phone_number_id` must both be set. If either is null, Q cannot be found on inbound calls.

2. **Check the assistant ID is set.**
   `tenants.vapi_assistant_id` must be set. If null, the sync has never completed successfully. Go to the tenant's portal (in edit mode) and click Save AI Settings.

3. **Check call forwarding is working.**
   Ask the client to call their own number from another device while their phone is off. If they get voicemail instead of Q, call forwarding is not set up. Walk them through their network's forwarding code.

4. **Check the AI behaviour settings are complete enough.**
   Q needs at minimum: business_name, lead_contact_name, opening_hours, at least one service. Check via OwnerSelector.

5. **Check the call log.**
   If Q is answering but behaving oddly, go to ListenTab → call log. Every call is logged. Check the transcript and the triage_outcome. If outcome is unexpected, the issue is in the system prompt — check the tenant's call type rules, emergency keywords, or additional instructions.

6. **Check Vapi dashboard.**
   If calls are not even reaching Q, check Vapi dashboard → Phone Numbers → the tenant's number → call logs. If the call shows in Vapi but the assistant-request webhook failed, check Vercel logs.

7. **Check Vercel function logs.**
   Vercel dashboard → verante-portal → Functions tab → vapi-assistant-request → recent invocations. All errors are logged with full detail.

---

## How to fix a tenant's demo call not working

The demo call requires `tenants.vapi_assistant_id` to be set. If the client gets the error "Save and sync your AI settings first", they need to:
1. Go to AIBehaviour
2. Fill in any missing required fields
3. Click Save AI Settings
4. Wait for the sync chip to show "Synced"
5. Try the demo call again

Also requires `VAPI_DEMO_PHONE_NUMBER_ID` env var to be set in Vercel. If this is missing, the demo endpoint returns 503. Check Vercel environment variables.

---

## How to reset a demo tenant's data (Ground Zero)

If a demo company's data has drifted and looks wrong, use the Ground Zero endpoint via the OwnerSelector UI. This reseeds:
- `catalogue_items` from sector-specific templates
- `appointments` with realistic demo data
- Clears any test call logs that have cluttered the view

Only accessible to finsolsoffice@gmail.com. The endpoint requires the owner email in the request body as a basic auth check.

---

## How to check what's happening with Vapi billing

Vapi charges per call minute. The dashboard at vapi.ai shows:
- Total minutes used this month
- Cost breakdown per assistant
- Individual call logs (separate from Qerxel's own call_logs table)

Qerxel applies its own minute tracking on top of Vapi's. The `included_minutes` column on `tenants` is the allocated allowance. vapi-webhook.js checks monthly usage after every call and fires warning emails at 80% and 100%.

---

## What Q knows and doesn't know about the business (information boundaries)

**Q knows (reads on every call):**
- Business name, opening hours, business context
- Full services/catalogue list with prices and durations
- Staff names, roles, specialisms
- Call handling rules (5 call types)
- Emergency keywords
- Keep-alive topics
- Provisional booking rule (if enabled)
- Additional instructions

**Q does NOT know:**
- Your actual calendar (unless provisional booking is enabled)
- Your real-time availability
- What happened in previous calls (no session memory between calls)
- Your accounting, invoicing, or payments
- Anything in `catalogue_items.internal_notes` (owner-only field)

**Q does not write to the calendar.** Even when provisional booking is enabled, Q offers a time slot and logs a provisional appointment — but the owner must confirm it in the portal. Q never creates a confirmed appointment directly.

---

## How the Q mascot (Vera) knows how healthy the business setup is

The Q score system (QScoreContext.jsx) computes three pillars on portal load:

**Config pillar** — Is the AI set up properly? Checks: business_name, opening_hours, business_context, lead_contact_name, services in catalogue, emergency_keywords, at least one call handling rule customised. A perfect score means Q has everything it needs to handle calls confidently.

**Performance pillar** — How are calls actually going? 50/50 blend of all-time outcome rates and last-10-days rates. A high score means a strong ratio of lead_captured + booked outcomes vs spam + filtered. A falling score means either calls are lower quality or Q's instructions need refinement.

**Tools pillar** — How well connected is the business? Are integrations set up? (Currently hardcoded to 100 until integrations tracking is fully built.)

**Overall score** — Weighted average. Shown as Q's mood (happy, satisfied, concerned, unhappy). Q's dialogue on each page reflects the score for that page's pillar.

**Q mode (tenant-controlled):**
- `very_helpful` — Q proactively coaches on every visit
- `jump_in` — Q coaches when scores fall below threshold
- `mind_own_business` — Q only speaks when called upon

---

## What happens when a tenant's minutes run out

1. At 80% of included_minutes: email to `business_email` warning they are approaching the limit. States their overage preference (standard vs premium voice).
2. At 100%: email notifying minutes are exhausted. Explains that calls continue at overage rates.

Currently Q never stops answering calls when minutes are exhausted — it just logs the overage. An actual "pause AI" button that stops Vapi from answering calls is planned but not built yet.

PAYG tenants (billing_model = 'payg') have a monthly_cost_limit. When this is hit, a warning is logged in Vercel logs but the AI continues running. A kill switch is also planned.

---

## Pricing tiers (Answer product)

| Tier | Price | Minutes/month | Notes |
|------|-------|--------------|-------|
| free | PAYG | None | Charged per minute |
| light | £29/month | ~100 | Sole traders |
| standard | £49/month | ~200 | Growing businesses |
| professional | £69/month | ~350 | Busy micro-businesses, removes discovery card from booking page |
| enterprise | £249/month | Custom | Multi-location |
| bespoke | Custom | Custom | Enterprise white-label |
| schedule_only | N/A | None | No Answer product, Schedule only |

Billing is not yet active (Stripe is wired but not live). During the build phase, tenants are set up directly in Supabase.

---

## How to provision a new tenant manually (without the signup flow)

When testing or setting up a specific client directly:

1. Create auth user in Supabase Auth (or have them sign up via the portal and stop before onboarding)
2. Insert into `tenants`:
   ```sql
   INSERT INTO tenants (business_name, business_email, subscription_tier, calendar_tier, listen_tier)
   VALUES ('Business Name', 'email@example.com', 'standard', 'entry', 'none');
   ```
3. Insert into `tenant_memberships`:
   ```sql
   INSERT INTO tenant_memberships (user_id, tenant_id)
   VALUES ('auth-user-uuid', 'new-tenant-uuid');
   ```
4. Provision Vapi phone number (see How a new client is onboarded, Step 3)
5. Have the client log in and complete their setup via the portal

---

## Key business rules that are non-negotiable in the product

These are decisions Philip has made about how the product works. They are not technical limitations — they are product choices. Do not override them without explicit instruction from Philip:

1. **Q's greeting structure is sacrosanct.** Tenants can add an addendum (one sentence). They cannot rewrite the greeting. The reason: consistent greeting quality is the product's first impression and must be defensible.

2. **The "provided free by Qerxel" footer on the booking page is non-removable.** Even the highest tier cannot remove it. This is the brand attribution that makes the free Schedule tier commercially viable.

3. **No inline CSS, no CSS variables, no CSS files.** All styling is inline in JSX. This is a hard rule maintained throughout the entire codebase. Reason: Philip finds it easier to audit and control styling without stylesheet abstraction.

4. **Service role key is NEVER in the frontend.** It is only in API files. The anon key is in the frontend and respects RLS. Never cross this boundary.

5. **The demo call MUST use the real Vapi assistant.** There is no demo assistant or hardcoded fallback. The purpose of the demo call is to test the actual data flow, not to show a generic AI.

6. **Internal catalogue notes are never read by AI.** The `catalogue_items.internal_notes` column is for the owner only. Q never sees it.

7. **Sensitive business mode is sealed.** Legal, medical, and financial businesses get a stripped-down Q that takes name, number, and urgency only. The transcript is not stored. This is a GDPR and professional obligation protection, not a feature toggle.
