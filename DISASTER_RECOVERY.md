# Qerxel — Disaster Recovery Protocols

Simple, plain-English protocols for each failure scenario.
The rule: every critical platform has a known fallback and a recovery time estimate.
Last updated: 2026-06-03

---

## GUIDING PRINCIPLES

1. **Code is always safe.** Everything is on GitHub. A laptop fire loses nothing except the machine.
2. **Data is always safe.** Supabase is cloud-hosted with built-in backups. No data lives locally.
3. **Recovery priority:** Users first, then data integrity, then speed of fix.
4. **One person can recover everything.** No specialist required — just credentials and these instructions.

---

## SCENARIO 1 — Local machine fails (laptop dies, lost, stolen)

**Impact:** You cannot develop or deploy. The live site keeps running unaffected.

**Recovery:**
1. Get any Windows machine with internet
2. Install VSCode, Node.js, Git
3. Run: `git clone https://github.com/philsk1/qerxel-portal`
4. Run: `npm install`
5. Run: `npm run dev`
6. Full dev environment restored in under 30 minutes

**Why it works:** All code is on GitHub. CLAUDE.md has the full project brief. Supabase keys are in the code.

---

## SCENARIO 2 — GitHub goes down

**Impact:** Cannot push code changes. Cannot trigger new Vercel deployments. Live site keeps running.

**Recovery — short outage (hours):**
- Wait. GitHub has 99.9%+ uptime. Continue working locally and push when it recovers.

**Recovery — extended outage (days):**
1. Create account on GitLab (gitlab.com) — free
2. Push the local repo there: `git remote add gitlab [new url]` then `git push gitlab`
3. Reconnect Vercel to the GitLab repo in Vercel dashboard settings

**Time to recover:** 20 minutes if needed urgently.

---

## SCENARIO 3 — Vercel goes down

**Impact:** Portal is offline. Users cannot log in or access the product.

**Recovery:**
1. Go to netlify.com — create account
2. Drag and drop the `/dist` folder (run `npm run build` first locally)
3. Site is live on a Netlify URL within 5 minutes
4. Update DNS to point to new URL if you have a custom domain

**Alternative:** Cloudflare Pages — same process, equally fast.

**Time to recover:** 15–30 minutes.

**Prevention:** Vercel is extremely reliable. This scenario is unlikely.

---

## SCENARIO 4 — Supabase goes down (temporary outage)

**Impact:** Portal loads but all data is blank. Users cannot save anything. Authentication fails.

**Recovery:**
- Wait. Supabase outages are typically resolved within hours.
- Monitor status at: status.supabase.com
- No action needed — data is not lost, just temporarily inaccessible.

**Communication:** If you have active customers, email them to advise of temporary maintenance.

---

## SCENARIO 5 — Supabase data loss (worst case)

**Impact:** Tenant data, call logs, leads could be lost.

**Prevention (do this now):**
- In Supabase dashboard → Settings → Database → enable **Point-in-Time Recovery** (requires Pro plan)
- This gives you 7-day rollback on any data

**Recovery if data is lost:**
1. Log into Supabase dashboard
2. Go to Settings → Database → Backups
3. Restore to the most recent backup
4. Contact Supabase support immediately — they have additional recovery options

**Manual backup (belt and braces):**
- Once a week: Supabase dashboard → Settings → Database → Download backup
- Store the file in cloud storage (Google Drive, iCloud, Dropbox)

---

## SCENARIO 6 — Vapi goes down (once integrated)

**Impact:** AI stops answering calls. Callers hear the business owner's own voicemail.

**Recovery — short outage:**
- Wait. Monitor status.vapi.ai
- No data is lost — calls simply aren't handled by AI

**Recovery — extended outage:**
- Temporarily forward the Vapi number back to the owner's direct number
- This is a manual step in Vapi dashboard or via Twilio

**Time to recover:** 5 minutes to reroute calls.

---

## SCENARIO 7 — Stripe goes down (once integrated)

**Impact:** New signups cannot pay. Existing subscriptions unaffected.

**Recovery:**
- Wait. Stripe is the most reliable payments platform in the world.
- Existing customers are not affected — their subscriptions run independently of Stripe's dashboard being up.
- New signups: note their details manually, process payment when Stripe recovers.

---

## SCENARIO 8 — Developer (Claude/AI) unavailable

**Impact:** Development work pauses.

**Recovery:**
- CLAUDE.md in the repo contains the full project brief, visual language, build state, and conventions
- Any competent React developer can pick up the codebase from that document
- The git history shows every decision made
- Supabase schema is visible in the Supabase dashboard

**What to hand to a new developer:**
1. GitHub repo URL
2. CLAUDE.md
3. PLATFORM_REGISTER.md
4. This document
5. Supabase credentials

---

## QUICK REFERENCE — Recovery Contacts

| Platform | Status page | Support |
|---|---|---|
| GitHub | githubstatus.com | support.github.com |
| Vercel | vercel-status.com | vercel.com/support |
| Supabase | status.supabase.com | supabase.com/support |
| Vapi | status.vapi.ai | vapi.ai/support |
| Stripe | status.stripe.com | support.stripe.com |

---

## IMMEDIATE ACTION CHECKLIST — If something breaks

1. Check the relevant status page above — is it a platform-wide outage?
2. If yes: wait and monitor. No action needed.
3. If no (your account specifically): check credentials, check billing is current, contact support.
4. If unsure: open Claude Code and describe what's broken — context is in CLAUDE.md.
