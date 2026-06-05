# Qerxel — Founder's Operating Guide

**Print this. Keep a copy offline. Read it before every working session.**

This document tells you exactly what your role is, what you are responsible for,
and what to do in every common situation. You do not need to be technical.
You need to know this document.

---

## YOUR ROLE IN ONE PARAGRAPH

You are the product owner, the strategist, and the only human in the loop.
You make decisions. Claude (AI) writes all the code, manages all deployments,
and handles all technical implementation. Your job is to know what you want,
describe it clearly, and review what comes back. You are not a developer.
You do not need to become one. What you must be is informed — and this document
is how you stay informed.

---

## WHAT CLAUDE DOES — NOT YOU

- Writes and edits all code
- Deploys to Vercel (via git push)
- Manages the database structure
- Fixes bugs
- Makes technical decisions
- Updates CLAUDE.md at the end of each session

**You should never edit code files directly.** If something looks wrong, describe
it to Claude and let Claude fix it. One well-intentioned edit in the wrong place
can break everything silently.

---

## WHAT ONLY YOU CAN DO

These things cannot be delegated to Claude. They require your credentials,
your judgement, or your presence.

1. **Manage credentials** — usernames, passwords, API keys. These are never
   in the codebase. They live offline with you.

2. **Make product decisions** — pricing, features, what to build next, who
   the customer is. Claude can advise but you decide.

3. **Sign up to platforms** — GitHub, Vercel, Supabase, Vapi, Stripe.
   These accounts must be in your name with your email.

4. **Handle customer relationships** — sales, onboarding calls, complaints.

5. **Control billing** — every platform has a billing section. You own it.
   An expired card or a missed payment can take the product offline.

6. **Run SQL in Supabase** — when Claude gives you a SQL script to run,
   only you can paste it into the Supabase SQL editor and click Run.
   Claude cannot reach into your Supabase account directly.

---

## YOUR DAILY HABITS (5 minutes)

Do these every day once you have live customers:

- [ ] Open the portal and log in — confirm it loads correctly
- [ ] Check the Dashboard — any unusual activity?
- [ ] Check Vercel dashboard — is the deployment green?
- [ ] Check your billing email — any failed payment notifications?

If any of these look wrong: open Claude Code and describe exactly what you see.

---

## YOUR WEEKLY HABITS (15 minutes)

- [ ] Go to Supabase → Settings → Database → Backups → download latest backup
- [ ] Save it to cloud storage (Google Drive, iCloud, or Dropbox)
- [ ] Check that Supabase Point-in-Time Recovery is enabled (Settings → Database)
- [ ] Review any new customer signups — are they completing onboarding?

---

## HOW TO WORK WITH CLAUDE EFFECTIVELY

Claude has no memory between sessions unless you have explicitly saved it.
The CLAUDE.md file in the project is the memory. Claude loads it automatically.

**Starting a session:**
1. Open VSCode
2. Open the Claude Code extension
3. Simply describe what you want to work on — Claude will read CLAUDE.md
   and have full context. You do not need to re-explain the project.

**Giving good instructions:**
- Be specific about what you see, not just what you want
- "The save button turns amber but the data disappears when I switch tabs"
  is better than "saving doesn't work"
- If something looks wrong visually, describe it precisely —
  "the text is too far to the right" is better than "it looks off"
- You can say "I don't understand what this does" — that is useful information

**Ending a session:**
- Ask Claude to update CLAUDE.md with the current state
- Ask Claude to commit and push to GitHub
- Close VSCode

**If you're unsure whether to proceed:**
- Ask Claude "what are the risks of doing this?"
- Claude will flag anything irreversible before it happens

---

## THE GOLDEN RULES

**Never share your service role key.** The Supabase service role key gives
unrestricted access to your entire database. It must never be in any code file,
never emailed, never pasted into chat. Store it offline only.

**Never edit code files directly in VSCode.** Describe changes to Claude instead.

**Never delete rows in Supabase without checking first.** Data deleted
from the database is permanent. Always ask Claude before running DELETE queries.

**Never force-push to GitHub.** If Claude ever suggests `git push --force`,
question it. This can overwrite history.

**Never approve a Stripe payout before verifying it's legitimate.** When
Stripe is wired up, any unusual payout requests should be verified first.

**Keep credentials offline.** A printed sheet, a password manager, or both.
Not in a text file on your desktop. Not in your email drafts.

---

## WHEN SOMETHING BREAKS — FIRST RESPONSE

**Step 1:** Don't panic. Almost everything is recoverable.

**Step 2:** Check the relevant status page (list in DISASTER_RECOVERY.md).
If the platform itself is down, wait. Nothing you can do.

**Step 3:** If it's not a platform outage, open Claude Code and say:
*"[This thing] has stopped working. Here is what I see: [describe exactly]."*
Claude will diagnose and fix it.

**Step 4:** If Claude is unavailable, consult DISASTER_RECOVERY.md for
the specific scenario and follow the steps there.

**What NOT to do when something breaks:**
- Do not start clicking around in Supabase, Vercel, or Vapi trying to fix it
- Do not delete or reset anything
- Do not contact platform support before checking with Claude first —
  Claude usually knows the cause faster than support tickets

---

## CREDENTIALS YOU MUST HOLD OFFLINE

Keep a printed or encrypted record of all of the following.
None of these should exist only in your head.

- GitHub username and password
- Vercel login (likely linked to GitHub — confirm this)
- Supabase email and password
- Supabase service role key (critical — not in any code file)
- Vapi account credentials (when created)
- Stripe account credentials (when created)
- Make.com account credentials (when created)
- Twilio account credentials (when created)
- Domain registrar login (when you buy a custom domain)
- The email address used for all of the above

**Recommended:** Use a password manager (1Password, Bitwarden, or Dashlane).
All credentials in one encrypted vault, accessible on any device with one master password.

---

## IF YOU NEED TO HAND THIS TO SOMEONE ELSE

If you ever need a developer, contractor, or agency to pick up this project,
give them these four documents in this order:

1. `CLAUDE.md` — full project context and current state
2. `PLATFORM_REGISTER.md` — every platform used and its purpose
3. `DISASTER_RECOVERY.md` — what to do when things break
4. `FOUNDER_GUIDE.md` — this document

Plus: access to GitHub, Vercel, and Supabase.

A competent developer can reconstruct full context in under an hour from these four files.

---

## THE MOST IMPORTANT THING

You are not the weakest link because you are not technical.
You are only the weakest link if you do not know what you are responsible for.
Now you do. Keep this document current, keep your credentials safe,
and describe clearly what you want built. That is the whole job.

---

*Last updated: 2026-06-03*
*Update this file at the end of every major change to your responsibilities or setup.*
