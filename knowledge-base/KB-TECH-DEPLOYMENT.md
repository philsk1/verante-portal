# Deployment, Environment, and Setup — Complete Reference

## Where everything runs

| Component | Provider | URL |
|-----------|---------|-----|
| Frontend (React + Vite) | Vercel Hobby | https://verante-portal.vercel.app |
| Serverless API functions | Vercel Hobby | https://verante-portal.vercel.app/api/* |
| Database | Supabase | https://kkrsvkxkefijmtbwykzv.supabase.co |
| Voice platform | Vapi | https://vapi.ai |
| AI (calls) | OpenAI (BYOK via Vapi) | — |
| AI (portal Q) | Anthropic | — |
| Email | Resend | — |
| SMS | Twilio | — |
| WhatsApp | Meta Cloud API | — |
| Payments | Stripe | — |
| Automation | Make.com | — |

---

## How to deploy

**Prerequisites:** Node.js installed, Vercel CLI installed, logged in to Vercel.

**Deploy command (always use this exact command from the project root):**
```bash
NODE_OPTIONS=--use-system-ca npx vercel deploy --prod
```

Run from: `C:\Users\philo\Documents\verante-portal` in Git Bash.

The `NODE_OPTIONS=--use-system-ca` flag is required on Windows 11 because the corporate/system CA bundle is needed for Vercel CLI to work correctly. Without it, the deploy fails with SSL errors.

**What happens:**
1. Vite builds the React app to `/dist`
2. Vercel uploads `/dist` as static assets and `/api/*.js` files as serverless functions
3. Vercel assigns the new build to the production URL
4. Old build is instantly replaced — no downtime

**GitHub:** The project is at https://github.com/philsk1/verante-portal. Vercel can auto-deploy on push, but the manual CLI deploy command above is the standard workflow used in development.

---

## Environment variables — complete list

All set in Vercel project settings (not in `.env` files — `.env` is for local development only and must never be committed to git).

To view/edit: Vercel dashboard → verante-portal project → Settings → Environment Variables.

### Required for call handling

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS, used in ALL API files | Supabase dashboard → Settings → API → service_role |
| `VAPI_PRIVATE_KEY` | Vapi API key for creating/updating assistants and initiating calls | Vapi dashboard → API Keys |
| `VAPI_DEMO_PHONE_NUMBER_ID` | Vapi's internal UUID for the outbound demo call phone number | Vapi dashboard → Phone Numbers → copy the ID of the demo number |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Twilio console → Account → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Twilio console → Account → Account Info |

### Required for notifications

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `RESEND_API_KEY` | Resend API key for transactional emails | Resend dashboard → API Keys |
| `SITE_URL` | The live site URL (used in email links) | Set to: `https://verante-portal.vercel.app` |

### Required for voice quality

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `CARTESIA_STANDARD_VOICE_ID` | Cartesia voice ID for standard tier tenants | Cartesia dashboard → your voice ID |
| `CARTESIA_PREMIUM_VOICE_ID` | Cartesia voice ID for premium tier tenants | Cartesia dashboard → your voice ID |

### Required for portal Q

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Haiku (Vera/support chat) | Anthropic console → API Keys |

### Required for frontend (Vite env vars — must be prefixed VITE_)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://kkrsvkxkefijmtbwykzv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public, read-only with RLS) | Supabase dashboard → Settings → API → anon |
| `VITE_VAPI_PUBLIC_KEY` | Vapi public key for web SDK (ear test in browser) | Vapi dashboard → API Keys → public key |

### Required for billing

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe dashboard → Webhooks → endpoint secret |

### Required for notifications cron

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `CRON_SECRET` | Shared secret for cron job auth | Any random 32+ character string |

### Required for onboarding scraping

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `FIRECRAWL_API_KEY` | Firecrawl API key for website scraping | Firecrawl dashboard |

### Optional — accounting integrations

| Variable | Description |
|----------|-------------|
| `FREEAGENT_CLIENT_ID` | FreeAgent OAuth app client ID |
| `FREEAGENT_CLIENT_SECRET` | FreeAgent OAuth app client secret |
| `XERO_CLIENT_ID` | Xero OAuth app client ID |
| `XERO_CLIENT_SECRET` | Xero OAuth app client secret |

### Local development only (`.env` file, never commit)

| Variable | Description |
|----------|-------------|
| `SUPABASE_PAT` | Supabase personal access token — used for management API queries via Node.js scripts |

---

## Local development setup

```bash
# Clone the repo
git clone https://github.com/philsk1/verante-portal.git
cd verante-portal

# Install dependencies
npm install

# Create .env file with local variables (NEVER commit this file)
# Add: SUPABASE_PAT=your_personal_access_token_here
# Add: VITE_SUPABASE_URL=https://kkrsvkxkefijmtbwykzv.supabase.co
# Add: VITE_SUPABASE_ANON_KEY=your_anon_key

# Start local dev server
npm run dev
# → Runs at http://localhost:5173
```

The local dev server runs the React frontend. API functions are NOT available locally (they require Vercel's serverless environment). To test API functions locally, either deploy to Vercel or use `vercel dev`.

---

## Vercel project configuration

**Framework preset:** Vite
**Build command:** `npm run build` (runs `vite build`)
**Output directory:** `dist`
**Node.js version:** 24.x (set in Vercel project settings)
**Functions runtime:** Node.js 24.x

**API file slot limit:** 12 files maximum on Hobby plan. Currently at 12/12. No new files can be added without consolidating existing ones.

---

## Supabase setup

### Row Level Security
All tables have RLS enabled. The standard RLS policy uses an `is_tenant_member` function:

```sql
-- Standard RLS policy (applied to most tables)
CREATE POLICY "tenant members only" ON table_name
  FOR ALL
  USING (is_tenant_member(tenant_id));

-- The function (exists in Supabase DB)
CREATE OR REPLACE FUNCTION is_tenant_member(check_tenant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = check_tenant_id
    AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER;
```

### Owner RLS bypass
The owner (finsolsoffice@gmail.com) needs to read all tenants' data for the OwnerSelector. This was implemented via a special bypass policy applied from `supabase_owner_rls.sql`. Applied 2026-06-14. Grants SELECT on 13+ tables for the owner's user_id.

### Database migrations
There is no automated migration tool currently in use. Schema changes are applied manually via:
1. Supabase dashboard → Table Editor (for simple column adds)
2. Supabase SQL Editor (for complex changes, constraint modifications)
3. Management API via Node.js script (for batch operations)

All schema changes should be documented in CLAUDE-SCHEMA.md immediately after applying.

---

## Vapi setup

### Account structure
Qerxel uses one Vapi account (BYOK — Bring Your Own Key). The Vapi account has an OpenAI API key configured as the LLM provider. This means Qerxel pays OpenAI rates via Vapi's billing.

### Phone numbers
Each tenant needs a Vapi phone number provisioned in the Vapi dashboard. The process:
1. Philip creates/purchases a UK number in Vapi dashboard
2. Philip updates the tenant's row in Supabase: `vapi_phone_number` (E.164) and `vapi_phone_number_id` (Vapi's UUID)
3. Tenant sets up call forwarding from their real number to their Vapi number

### Assistant configuration
Vapi assistants are created/updated programmatically via vapi-sync.js. Each tenant has ONE Vapi assistant (identified by `tenants.vapi_assistant_id`). The assistant is NOT configured in the Vapi dashboard — all config is driven from Supabase via the sync endpoint.

The assistant is configured to use the `assistant-request` webhook model — Vapi fetches the current config fresh on every call rather than using a cached version. This means every call uses the most up-to-date tenant configuration.

### Webhook URLs configured in Vapi
- **Server URL for calls:** `https://verante-portal.vercel.app/api/vapi-assistant-request` — Vapi calls this BEFORE answering each call to get the assistant config
- **Server URL for reports:** `https://verante-portal.vercel.app/api/vapi-webhook` — Vapi calls this AFTER each call with the transcript, summary, and structured data

### Demo phone number
A separate Vapi phone number is configured specifically for outbound test calls (`VAPI_DEMO_PHONE_NUMBER_ID`). When a tenant clicks "Call me now" in the portal, this number calls them.

---

## Twilio setup

### Account
Twilio account used for:
1. Spam detection (Lookup API + Nomorobo add-on)
2. SMS notifications to tenant (escalation alerts)
3. SMS to callers (sms_followup_enabled feature)

### Nomorobo add-on
The spam detection requires the Nomorobo add-on to be enabled in the Twilio account. Without it, the spam check returns false (safe to use — no call is blocked on a missing add-on).

To enable: Twilio console → Add-ons → Nomorobo Spam Score → Subscribe.

### From number
SMS messages sent from a Twilio number. This number must be configured in the `_sms.js` helper. As tenant scale grows, consider Twilio Messaging Service for number rotation.

---

## Resend setup

### Domain
Email is sent from a domain verified in Resend. The from address (e.g. noreply@qerxel.com) must have its DNS records (SPF, DKIM) configured at the domain registrar and verified in Resend.

### Email types sent
- New lead alert → tenant's `business_email`
- Urgent escalation alert → tenant's `business_email`
- 80% minutes warning → tenant's `business_email`
- Minutes exhausted → tenant's `business_email`
- Booking confirmation → customer's email (from `/api/integrations booking-confirm`)
- Welcome email → new tenant's email

---

## Meta WhatsApp setup (per tenant)

WhatsApp messages are sent FROM each tenant's own WhatsApp Business number. This requires each tenant to:

1. Have a WhatsApp Business account
2. Create a Meta App in the Meta Developer Portal
3. Enable WhatsApp Business API on the app
4. Get their `phone_number_id` and generate a permanent `access_token`
5. Enter these in the Integrations tab in the portal

Philip (or support) walks tenants through this. The Integrations tab stores these credentials in `tenant_integration_credentials`.

---

## Make.com automations

Make.com handles scheduled jobs that cannot run serverlessly (cron jobs beyond Vercel's 10-second execution limit, or jobs that need to retry on failure).

Current scheduled scenarios:
- **Appointment reminders** — runs every 30 minutes, calls `/api/notify?action=remind` with `CRON_SECRET`
- **Daily cost email** — runs at 08:00 UK time, calls `/api/notify?action=daily-cost`
- **Weekly report** — runs Monday 08:00 UK time, calls `/api/notify?action=weekly-report`

At 30+ tenants: migrate from Make.com to n8n (self-hosted). Make.com costs increase with operations; n8n is fixed cost.

---

## How to set up the system from scratch (full rebuild guide)

If you need to recreate the entire system from nothing:

1. **Create Supabase project** in EU region
2. **Apply all table definitions** from KB-TECH-DATABASE.md
3. **Enable RLS** on all tables, apply `is_tenant_member` function and policies
4. **Create Vercel project** connected to the GitHub repo
5. **Set all environment variables** in Vercel (list above)
6. **Configure Vapi account:**
   - Add OpenAI API key as BYOK LLM provider
   - Add Cartesia API key as voice provider
   - Note your private key → VAPI_PRIVATE_KEY
   - Create a demo phone number → VAPI_DEMO_PHONE_NUMBER_ID
   - Note your public key → VITE_VAPI_PUBLIC_KEY
7. **Configure Twilio:**
   - Get Account SID and Auth Token
   - Enable Nomorobo add-on
8. **Verify email domain** in Resend
9. **Deploy** using `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod`
10. **Create the first tenant** via `/signup` in the portal
11. **Provision a Vapi phone number** for the tenant → update `tenants` row
12. **Test** using the "Call me now" button in AIBehaviour

The system is live once step 11 is complete and the tenant has set up call forwarding.
