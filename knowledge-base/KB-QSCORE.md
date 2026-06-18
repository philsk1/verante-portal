# Q Score and Q Mood

## What is the Q Score?

The Q Score is a measure of how well set up and how well performing your Qerxel account is. It is a number between 0 and 100 and it directly determines Q's mood — the expression on the mascot in the corner of your portal.

The Q Score is not just a vanity metric. It is a coaching signal. When the score is low, Q tells you specifically what is dragging it down and what to fix. When the score is high, Q confirms things are working well.

---

## What are the three pillars of the Q Score?

**Config score** — Is your AI properly set up? Checks whether you have filled in the things Q needs to do its job:
- Business name
- Opening hours
- Business context
- Contact name (lead contact)
- At least one service or catalogue item
- Emergency keywords
- At least one call handling rule customised

A perfect config score means Q has everything it needs to handle calls confidently. Missing items drag this down.

**Performance score** — How well are your calls actually going? Based on your call outcomes over time. A 50/50 blend of all-time outcomes and the last 10 days.

High-value outcomes (lead_captured, booked, referred_out) push this score up. Low-value outcomes (filtered, hard_close, spam) are neutral. The score falls if escalated outcomes are high or if your conversion rate is poor.

**Tools score** — How well connected is your account? Based on integrations enabled and active. (This pillar is currently hardcoded to 100 while the full integrations tracking is built out.)

**Overall score** — Weighted average of all three pillars. This is what the mascot displays as its global mood.

---

## What do the different Q moods mean?

**Very happy** (score 85-100) — Your account is well set up and performing well. Q is genuinely satisfied with the state of things.

**Satisfied** (score 70-84) — Things are broadly good but there are one or two things Q would like you to look at.

**Concerned** (score 50-69) — There are gaps that are affecting how well Q can handle your calls or your call quality is below where it should be.

**Unhappy** (score 0-49) — Significant issues need attention. Q is not working at its best and you are likely missing calls or losing leads.

---

## Which page Q score does Q show on each page?

Q shows the score most relevant to the page you are on:

- **AI Behaviour / Business Profile pages** — shows the Config score
- **Dashboard / Listen / Call logs** — shows the Performance score
- **Integrations page** — shows the Tools score
- **All other pages** — shows the overall (global) score

This means Q's mood changes as you move around the portal. This is intentional — Q is telling you about the aspect of your account most relevant to what you are currently looking at.

---

## What is the Q coaching panel?

When Q's score is not perfect, a coaching panel shows alongside Q with specific feedback. This might say things like:

*"Your Business Context is empty — callers are asking where you cover and Q can't answer."*

*"Your conversion rate has dropped this week. 12 leads captured, 1 booked. Worth reviewing your call handling rules."*

The coaching panel shows up to 5 specific issues, sorted by severity. Fix the highest-severity issues first — they have the most impact on the score.

---

## Can I dismiss Q's coaching?

Yes. If Q is coaching on something you have already addressed, or something that does not apply to your business, click "I'm happy with this" and Q will not raise that specific issue again for 30 days.

Q mood can still change during the 30-day dismissal period if your actual score moves. A dismissal suppresses the coaching text, not the underlying score.

If your score genuinely improves after dismissing, the mood reflects the improvement — the dismissal does not artificially inflate the score.

---

## What is Q Mode and how does it affect behaviour?

Q Mode is your preference for how often Q proactively coaches you:

**Very helpful** — Q speaks whenever it has something to say. If your score drops, Q tells you immediately. Recommended when you are actively setting up or optimising your account.

**Jump in if important** — Q stays quiet unless something significant has changed. Good for accounts that are running well.

**Mind your own business** — Q only speaks when you explicitly ask (click the Q mascot). For experienced users who want the mascot without the coaching.

Set your Q Mode in the Account Settings page. You can change it at any time.

---

## Why does Q's mood seem different between sessions?

Q's score is recalculated on every portal load from live data. Between your sessions:
- Calls may have come in with mixed outcomes (affecting performance score)
- A coaching dismissal may have expired
- Something in your config may have changed

If Q's mood seems unexpectedly worse, check the coaching panel — it will tell you exactly what changed.

---

## What is the difference between the dismissal decay and the raw score?

The Q score system has two mechanisms:

**Raw score** — calculated purely from data. Always accurate to current state.

**Mood adjustment** — can be slightly reduced by dismissal decay. If you dismissed Q's coaching 60 days ago and your score has not improved, the mood shown may be one step worse than the raw score suggests, as a reminder.

The raw score always wins in the upward direction. If your score genuinely improves, the mood reflects that immediately, even if there was a decay in effect.

---

## Will the Q Score ever be zero?

Only if you have no data at all and have filled in nothing. In practice, even a basic account with a business name, one service, and a few calls will score above zero. The score is designed to push you toward a complete, well-performing account — not to punish new accounts.

---

## Is the Q Score visible to callers or anyone else?

No. The Q Score is private to your portal. Callers do not see it. It is a tool for you to understand how well your Qerxel account is working.
