# Complaint Procedure and Support Policy

## Philosophy

Qerxel holds itself to one standard: if we failed, we own it completely, escalate immediately, and compensate without argument. If the system did exactly what the client configured it to do, that is not a failure — it is a configuration that needs adjusting, and we will help them adjust it right now, on this call, for free.

Every complaint is examined against the call log. There is no complaint without evidence. This protects the client from a guessed response and protects Qerxel from a misdirected one. The log is the ground truth. Everything else is opinion.

Accountability runs both ways. Qerxel is accountable for what Qerxel does. The client is accountable for what they configured. The procedure below makes that distinction clearly, consistently, and without blame — only explanation.

---

## Step one — Complaint receipt

Every complaint must begin with a specific call reference: date, time, and the phone number involved.

If a client contacts Support without a call reference, respond:

*"To look into this properly I need to find the specific call. Can you give me the approximate date and time, and the number that called? I'll pull the full log right now and we can go through it together."*

No investigation begins without a call reference. No response is given without reviewing the log. This is not bureaucracy — it is the only way to give the client a true and useful answer.

---

## Step two — Log review

Once a call reference is provided, review in this order:

1. **Call log entry** — was the call received, answered, and logged?
2. **Triage outcome** — what did Q assign?
3. **Transcript** — what was actually said?
4. **Client configuration at the time** — triage mode, call type rules, keep-alive topics, additional instructions, emergency keywords
5. **Vapi infrastructure status** — was the voice platform operating normally?
6. **Qerxel service status** — was there a confirmed incident active at the time?

The review takes minutes. What the log shows is what happened.

---

## Complaint classification

Every complaint, after log review, falls into one of four categories.

---

### Category A — Verified Qerxel service failure

**What this is:** The log confirms Q was unreachable, the call was not handled, or the system produced an outcome that cannot be explained by any client configuration. The failure originates in Qerxel's infrastructure — Vapi, Supabase, Vercel, or Twilio.

**How Q responds on the support call:**

*"I've reviewed the log and this is a failure on our side — not something you did or could have prevented. I'm escalating this to our support team right now. You'll receive a personal message and a full written report within 24 hours confirming exactly what happened, how long it lasted, and your compensation. Qerxel's policy is ten times the value of what you lost, paid directly to you. I'm sorry this happened."*

Q does not attempt to resolve this on the call. Q does not ask the client to change settings. Q escalates and closes.

**What Support does immediately:**

- Log the incident: client ID, time of failure, verified downtime duration
- Send a WhatsApp to the Support leadership number: client name, business name, failure description, downtime duration, estimated 10x compensation figure
- Send an email to the Support leadership address: full incident detail, transcript if available, configuration at time of call, downtime calculation, compensation figure
- If multiple tenants are affected, trigger the mass notification and payment protocol below

**Compensation:**

10 times the value of the verified downtime. Calculated as the client's tier value pro-rated to the minutes lost, multiplied by ten. Paid as a cash refund or Stripe account credit — client's choice. This is not a gesture. It is the standard. It is non-negotiable and issued without the client having to ask for it.

---

### Category B — Configuration-caused outcome

**What this is:** The log confirms Q behaved exactly as the client's settings instructed it to behave. The client is unhappy with the outcome, but the outcome is a direct result of choices they made in their portal.

**Common examples:**
- Client set Triage Mode to Lean or Strict. Q closed a call that ran long or went off-topic. Q followed the configured rules correctly.
- Client did not add a service to their catalogue. Q told a caller it was not offered. Q had no information to say otherwise.
- Client did not configure keep-alive topics. Q closed a long caller. Keep-alive topics were the tool available to prevent this.
- Client chose not to enable the booking link. Q offered a callback instead of a link. Q followed the configuration.

**How Q responds on the support call:**

*"I've looked at the call. What happened here is that Q followed your current settings exactly — it did what you'd asked it to do. Let me explain what caused this, because once you see it, it's a very easy fix."*

Q then explains specifically: which setting caused the outcome, where it is in the portal, and what changing it will do. Then:

*"Do you want me to help you fix that right now? I'm going to stop the charge and give you the next ten minutes of my time free — let's get this sorted together."*

Q pauses the billing clock for ten minutes and walks the client through the change in their portal.

The principle Q communicates clearly and kindly throughout:

*"You have complete control over this. Q does exactly what you tell it to do — which means you can always make it work exactly the way you want. Let me show you how."*

**What is always available to clients at any tier, which Q explains:**

- Write *"never close a call without the caller's explicit agreement"* in Additional Instructions. Q treats this as a hard rule.
- Add any topic to Keep-Alive Topics. Q will never end a call while that topic is active, for up to the maximum minutes configured.
- Set Call Type Mode to Open for any call type where Q should explore and never rush.
- Change Triage Mode to Thorough for deeper, longer conversations across the board.

These options exist at every tier. Q explains them. Q offers to help configure them. Q does not apologise for the system doing what it was told.

**Strike system:**

- **First contact on this issue:** Explain, offer 10 free minutes to fix it together, resolve on the call.
- **Second contact on the same issue, unresolved:** Explain again. Offer 10 free minutes again. Be more thorough. Check whether the fix from the first call was actually made.
- **Third contact on the same issue:** Q does not attempt to resolve further. *"This has come up a few times now and I want to make sure you get the right level of help. I'm going to flag this to our senior support team and someone will be in touch with you directly."* Escalate to Support leadership.

---

### Category C — Unclear origin

**What this is:** The log does not show a clear Qerxel failure, but also does not clearly show a configuration cause. Q's behaviour was reasonable given the information available, but something felt unsatisfactory to the caller or client.

**How Q responds:**

*"Looking at this call, I can see why this felt unsatisfactory, even though I don't see a system failure here. Let me understand what you were expecting and we'll see if there's a setting that gets you closer to that."*

Offer 10 free minutes to review and configure together. Apply the strike system as above.

---

### Category D — Complaint not upheld

**What this is:** The log confirms Q performed correctly, no configuration caused the issue, and the complaint relates to caller behaviour or a situation outside what Qerxel can reasonably affect — a caller who refused to engage, a call from a number the client had blocked themselves, a caller who hung up before Q could speak.

**How Q responds:**

*"I've reviewed the full log and I can see what happened. Q answered the call, handled it correctly, and logged the outcome accurately. There isn't a failure here on Qerxel's side or in your configuration — this one is simply what it is. Is there anything I can help you set up to handle a similar situation differently in future?"*

No gesture is offered. The explanation is delivered with courtesy. The door is left open for configuration help.

---

## Mass service failure protocol

When a confirmed Qerxel infrastructure incident affects multiple tenants simultaneously:

**Within 15 minutes of confirmed failure:**
- Log the incident: start time, nature of failure, scope
- WhatsApp to Support leadership: "INCIDENT ACTIVE — [description] — [start time] — estimated [n] tenants affected"
- Email to Support leadership: full incident detail, scope, current status, ETA if known

**If clients call support during an active incident:**
*"We're aware of a service issue right now and our team is working on it. You don't need to do anything. Once it's resolved you'll receive a personal message from us with the full details and your compensation automatically applied. I'm sorry for the disruption."*

**On resolution:**
1. Log end time. Calculate verified downtime per affected tenant.
2. Generate compensation list: each tenant's downtime, their tier value, their 10x figure.
3. Send individual WhatsApp and email to every affected tenant — unprompted, before they contact us:

*"We had a service failure between [time] and [time]. During that window, [X] minutes of your calls were not covered. We owe you 10 times that value: [£X]. This has been applied to your account today. A full incident report is attached. We're sorry — this should not have happened and we've taken steps to make sure it doesn't happen again."*

4. Process all payments simultaneously via Stripe. No client has to ask. No client has to complain. It is issued automatically on resolution.
5. Publish a formal post-incident report within 48 hours: what failed, why, what was fixed, what prevents recurrence.

---

## Escalation triggers — when Support contacts leadership directly

Escalate without waiting in any of these situations:

- Any confirmed Category A service failure — escalate immediately, while the client is still on the call
- A client on their third contact about the same unresolved issue
- A client who expresses intent to leave
- A client who mentions legal action or a regulatory complaint
- Any complaint involving a sensitive business type (legal, medical, financial)
- A client who has called Support more than four times in any 30-day period
- Any complaint Q cannot classify confidently from the log

---

## Operating principles

1. Every response is grounded in the log. Not in what Support thinks happened. In what the log shows.
2. Where Qerxel failed: acknowledge immediately, escalate, compensate without argument.
3. Where the client's configuration caused the outcome: explain clearly, never defensively, offer to fix it together right now for free.
4. Never make a client feel foolish. The portal is powerful. Configuration takes learning. Everyone adjusts settings at the start.
5. The ten free minutes Q offers is Q's own time — not added to their plan. It is Q stopping the clock and saying: *I'm here, let's fix this together.*
6. A client who ends a support call knowing exactly what to change, feeling heard, and believing they were treated with respect — that is the best possible outcome of a Category B complaint.
7. A client who ends a call after a Category A failure believing Qerxel acted with complete integrity and speed — that is the only acceptable outcome of a genuine service failure.
