# Architectural Decisions and Reasoning

## Why this document exists

Code tells you what was built. This document tells you why. These are the decisions that would be confusing or impossible to infer from the codebase alone — the constraints, tradeoffs, and deliberate choices that shaped the system.

A future developer or AI reading this alongside the code should understand not just what to change, but whether to change it.

---

## Why assistant-request instead of a static Vapi assistant

**Decision:** Use Vapi's `assistant-request` webhook model rather than configuring a static assistant in the Vapi dashboard.

**Why:** With a static assistant, a tenant's AI settings would only update when the assistant is manually patched. Tenants would make changes in the portal and those changes would be queued, batched, or asynchronous. More importantly, per-call personalisation — knowing who is calling, building a different prompt for a returning customer vs a new enquiry — is impossible with a static assistant because the assistant config is identical on every call.

The assistant-request model fires a webhook before every call and returns the full assistant config fresh. This means:
- Tenant changes take effect on the very next call (not after a sync cycle)
- Caller identity is incorporated into the prompt in real time
- Different first messages can be generated based on who is calling
- No stale config ever reaches a call

The cost is a small latency on call answer (the webhook has to respond before Q speaks). This is absorbed by the `firstMessageDelay` setting (default 1.2 seconds), which also improves naturalness by avoiding an instant robotic response.

---

## Why the system prompt is built server-side, not stored

**Decision:** The full system prompt is assembled on every call (and on every sync) from raw database values, not stored as a text blob.

**Why:** A stored prompt would drift from the underlying data. If a tenant changes their services, the stored prompt has outdated services until it is regenerated. Worse, you would need to decide when to regenerate it — on every change to any of eight tables — which creates a complex invalidation problem.

Building the prompt from scratch on every call means the prompt is always consistent with the current state of the database. There is no cache to invalidate. The generation is fast (milliseconds) and the Supabase queries are parallelised, so the latency impact is minimal.

The one exception is the Vapi assistant — it stores a `firstMessage` (the greeting) which is also rebuilt on sync. But the system prompt itself is regenerated on every call from live data.

---

## Why the tenant data is fetched in 8 parallel queries rather than a JOIN

**Decision:** Eight separate Supabase queries are run in `Promise.all` rather than a single SQL JOIN across all tables.

**Why:** Supabase's PostgREST client does not support arbitrary JOINs as cleanly as raw SQL. Using the JS client is simpler, more readable, and easier to evolve — adding a table means adding one line to the Promise.all, not rewriting a complex JOIN. The parallelisation via Promise.all ensures all 8 queries execute simultaneously, so the total latency is bounded by the slowest single query (typically ~50ms) rather than 8 × 50ms = 400ms.

A single raw SQL query via RPC would be slightly faster but harder to maintain. The difference is not worth the complexity at current scale.

---

## Why spam rejection happens before the call connects

**Decision:** Spam calls are rejected at the assistant-request stage (before Q speaks) rather than being answered and then dismissed.

**Why:** Spam calls count against minute usage once the call connects. Answering a spam call and then Q saying "I'm sorry, this looks like a spam call, goodbye" costs real minutes. At scale with many tenants, this cost adds up.

Rejecting at the assistant-request stage returns a Vapi error object that causes the call to not be answered at all. The caller hears a busy signal or silence, not Q. No minutes consumed.

**The important exception:** Spam detection fails open. If the Nomorobo API request times out (3-second timeout), the call proceeds normally. A real customer should never be blocked because a spam check timed out. This is the correct tradeoff — false negative (letting a spam call through) is better than false positive (blocking a real customer).

---

## Why WhatsApp messages come from the client's own number

**Decision:** WhatsApp after-call messages are sent using the tenant's own Meta Cloud API credentials, not a shared Qerxel WhatsApp account.

**Why:** WhatsApp is fundamentally different from SMS in how it builds trust. A message from an unknown WhatsApp Business account with a Qerxel number is suspicious. A message from the same business's WhatsApp account that the caller may already know — "Hi Sarah, it's Paul's Plumbing, thanks for calling" — is completely natural.

The additional complexity of storing per-tenant WhatsApp credentials in `tenant_integration_credentials` is worth it because the customer experience is significantly better.

The alternative (a shared Qerxel WhatsApp sender) would also require Meta verification for Qerxel as a Business Solution Provider (BSP) — a regulatory process that would take months. Per-tenant API credentials bypass this entirely.

---

## Why `appointments.status` does not include 'scheduled'

**Decision:** The status enum is `provisional`, `confirmed`, `completed`, `cancelled`, `no_show`. 'Scheduled' does not exist.

**Why:** 'Scheduled' would be semantically redundant. Every appointment that exists is by definition scheduled. The system uses `confirmed` to mean "this appointment is real and the client knows about it" — which is what most people mean by 'scheduled'. Using two terms for the same state would cause code drift (some filters checking `confirmed`, others checking `scheduled`) and eventual bugs.

This is a HARD RULE. Any code that sets `status = 'scheduled'` is wrong and will produce data that fails all status filters.

---

## Why the callers table is shared across tenants

**Decision:** A single `callers` table holds all caller phone numbers. Tenants share caller records.

**Why:** A caller may ring multiple businesses on the Qerxel platform. If each tenant had their own callers table, the same phone number would create duplicate records across multiple tenants with no way to correlate them.

The shared callers table with per-tenant relationship data in `caller_tenant_relationships` is the correct normalised approach. The GDPR data (opt-out, deletion request) is per-relationship, not per-caller — because opting out of one business does not mean opting out of all.

The tradeoff is that RLS on the callers table is more complex — tenants should be able to see their own callers but not all callers on the platform. This is resolved by the RLS policy joining through `call_logs` to verify the caller has had calls with the tenant.

---

## Why inline styles and no CSS files

**Decision:** All styling is applied as inline JSX style props. No CSS files, no CSS variables, no styled components.

**Why:** This is Philip's explicit preference maintained throughout the entire codebase. The reason stated is that inline styles are easier to audit — every component is self-contained and you can see exactly what it looks like without context-switching between files. There is no risk of a global CSS change unexpectedly affecting an unrelated component.

The tradeoff is verbose JSX and the inability to use CSS animations, pseudo-selectors, or media queries (without workarounds). These tradeoffs have been accepted.

**This is a hard rule. Never introduce CSS files, stylesheets, or CSS-in-JS solutions regardless of how much simpler they would make a particular styling problem.**

---

## Why there is no admin authentication on the admin endpoints

**Decision:** `api/admin.js` and `api/ground-zero.js` check for `ownerEmail = 'finsolsoffice@gmail.com'` in the request body/query, not a signed JWT or shared secret.

**Why:** This is a pragmatic decision made early in development when Philip was the only user and the admin features were for internal use only. A proper solution would require a separate admin JWT, a role claim in Supabase, or a shared secret — all of which require additional infrastructure.

The current check is a lightweight security measure appropriate for a single-user tool with no public documentation of the admin endpoint path. It should be upgraded when:
- The business has staff who should access admin features
- The admin path is published in any public documentation
- The tenant count makes the admin data commercially sensitive

At that point, implement proper HMAC signing on the request or move admin functions behind Supabase Auth with admin-role claims.

---

## Why the API is capped at 12 files on Vercel Hobby

**Decision:** Vercel Hobby plan allows exactly 12 serverless functions. The project is at capacity.

**Why:** Vercel Hobby is free and sufficient for a startup with <50 tenants. The 12-function limit has been managed by consolidating multiple actions into single files (e.g., `integrations.js` handles 8+ different actions via an `action` parameter).

The limit becomes a hard constraint when a new feature requires a new public endpoint. At that point the options are:
1. Consolidate two existing files into one (always preferred first)
2. Upgrade to Vercel Pro at £16/month (removes the limit — appropriate at 30+ tenants)

Do not build workarounds (reverse proxies, edge functions, etc.) to extend the Hobby limit. Upgrade is the clean solution.

---

## Why Vercel rather than a traditional Node.js server

**Decision:** The API runs as Vercel serverless functions rather than a persistent Express or Fastify server.

**Why:** Serverless eliminates server management entirely — no EC2/VPS to maintain, no uptime monitoring for the server itself, no scaling decisions. For a solo founder building and operating everything with AI tools, this is the right tradeoff. Cold starts add a tiny amount of latency on the first call after idle periods but are imperceptible to callers (the call connection itself takes longer than any cold start).

If Qerxel reaches 1000+ tenants with thousands of concurrent calls, serverless may hit concurrency limits and a persistent server becomes the better choice. That is a problem for a much later stage of the business.

---

## Why the assistant-request and vapi-webhook have no auth

**Decision:** The two Vapi-facing endpoints (`/api/vapi-assistant-request` and `/api/vapi-webhook`) have no authentication headers or signed payloads verified.

**Why:** Vapi's webhook delivery does not sign payloads with an HMAC secret (unlike Stripe). The endpoints must be publicly accessible for Vapi to call them. The only practical protection is that these URLs are not documented or discoverable — they are just backend endpoints called from Vapi's infrastructure.

If a future version of Vapi adds webhook signing (they may add this), implement HMAC verification immediately. Until then, the risk of a malicious actor calling these endpoints is low because:
- An attacker would need to know both the URL and the format of a valid Vapi payload
- The endpoints only write to the database (never execute arbitrary code)
- Malicious writes are bounded by having a valid `assistantId` or `phoneNumberId` — an attacker without a real tenant in the system cannot affect real tenant data

---

## Why `.maybeSingle()` not `.single()`

**Decision:** All Supabase queries that expect 0 or 1 rows use `.maybeSingle()` not `.single()`.

**Why:** `.single()` throws an HTTP 406 error if the query returns 0 rows. This would cause a runtime crash when a caller is not in the contacts table, when a tenant has no call handling rules, or any other situation where 0 results is a valid state. `.maybeSingle()` returns `null` instead, which can be handled gracefully.

This is enforced as a hard rule across the entire codebase. Any use of `.single()` should be treated as a bug.

---

## Why Q never touches existing appointment data with the greeting

**Decision:** Q's greeting is hardcoded and the caller intelligence context is prepended — never changes the greeting template itself.

**Why:** The greeting is the business's most important first impression. Its structure (business name, Q identity, capability statement, callback commitment) has been designed to maximise trust on the first three seconds of a call. Tenants can add a one-sentence addendum. They cannot alter the structure.

This decision protects against tenants writing bad greetings ("Hi, I'm a robot") that damage caller trust and reflect poorly on Qerxel's product. The greeting is a product decision, not a user configuration.
