# Listen — Call Log and Live Desk

## What is the Listen tab?

Listen is the call log and live desk for your inbound calls. It has two areas:

**Call log** — A record of every call Q has handled. For each call you can see when it came in, how long it lasted, the caller's number and name (if known), the triage outcome (what happened), Q's AI summary, and the full transcript.

**Live desk** — A real-time view when you are on a call yourself. Shows the caller's history, your services, your team, and available slots — giving you the information you need while you speak.

---

## What information does the call log show?

For each call:
- **Date and time** — when the call came in
- **Duration** — how long the call lasted in seconds/minutes
- **Caller** — phone number and name if known (from contacts or structured data Q extracted)
- **Outcome** — the triage outcome Q assigned (lead captured, booked, referred out, filtered, escalated, hard close, spam)
- **Summary** — Q's 1-2 sentence summary of what the caller needed and what action was taken
- **Transcript** — the full verbatim conversation between Q and the caller

---

## What are the triage outcomes and what do they mean?

Every call ends with exactly one outcome:

**Lead captured** — A new customer enquired, gave their contact details, and is interested. You need to follow up. This is the most important outcome for business growth.

**Booked** — The caller booked or confirmed an appointment during the call. The appointment is in your calendar.

**Referred out** — The caller needed something you do not offer. Q gave them a referral partner's details. The referral is logged.

**Filtered** — A sales call, wrong number, or out-of-scope enquiry. Q closed it cleanly. No action needed.

**Escalated** — An urgent situation or official enquiry. You were notified by SMS and/or email at the time. You need to review and call back.

**Hard close** — A caller Q could not help. Q declined clearly and ended the call.

**Spam** — An automated or nuisance call. Q rejected it.

---

## How do I find a specific call?

Use the search and filter options at the top of the call log:
- Search by caller name or phone number
- Filter by outcome (show only leads, only escalations, etc.)
- Filter by date range
- Filter by call duration

---

## What is the AI summary and can I trust it?

The AI summary is a 1-2 sentence description of what happened on the call, written by the same AI that handled the conversation. It is generated from the transcript.

The summary is accurate for most calls. Occasionally:
- Complex calls with multiple topics may not capture every nuance
- Callers with strong accents may have transcription errors that affect the summary
- Escalated calls where the AI felt uncertain may have cautious summaries

Always read the transcript if you need to verify what was actually said. The summary is for quick scanning — the transcript is the authoritative record.

---

## Can I read the full transcript?

Yes. Click on any call in the log to expand it and see the full transcript. The transcript is verbatim — every word Q said and every word the caller said, in order.

For sensitive business types (legal, medical, financial), transcripts are not stored. The call log shows the outcome and duration but no content.

---

## What is the Live Desk?

The Live Desk activates when you pick up a call yourself (rather than letting Q handle it). It shows on your screen while you are on the call:

- **Caller history** — if the caller is in your contacts, their previous appointments and notes are shown
- **Service catalogue** — your services and prices, quickly searchable
- **Team availability** — who is available right now
- **Booking suggestion** — available slots for the service the caller is asking about

You can create a booking directly from the Live Desk without leaving the call. The appointment is created in the calendar immediately.

---

## What tier do I need for the Live Desk?

The Live Desk is part of the Listen product. You need `listen_tier = 'standard'` or higher. If you have the Answer product (AI call handling), you can add Listen for £10/month.

---

## Does the Listen tab show calls Q rejected as spam?

No. Spam calls are filtered at the network level before Q speaks. They appear in the call log with outcome `spam` but no transcript because no conversation took place.

---

## Can I see who called but did not book?

Yes. Filter the call log by outcome `lead_captured` to see callers who expressed interest but did not book. These are your unconverted leads. Their contact details are in the call log (and in the Contacts view) for follow-up.

Comparing lead_captured against booked volumes over time is one of the most useful signals for understanding your conversion rate.

---

## What happens if a call is escalated?

When Q assigns the `escalated` outcome, two things happen immediately:
1. You receive an SMS and/or email notification (depending on your escalation method setting) with the caller's name, number, and Q's summary
2. The call appears in the Listen tab under Escalated

Review escalated calls promptly. They typically involve emergencies, complaints, or official correspondence that requires a human response.

---

## How long are calls stored?

Your data retention setting (in Account Settings) determines how long calls are kept. The default is 90 days. After the retention period, old call logs are deleted automatically.

If you need longer retention for compliance reasons (insurance, legal proceedings), increase the retention setting before the calls fall outside the window.
