# After-Call Messaging

## What is after-call messaging?

After-call messaging is the automatic system that sends a message to a caller within seconds of a call ending. It is managed entirely by your system — Q passes the facts from the call and your settings determine which messages go, through which channel, and with what content.

You do not need to do anything after a call. The system handles it.

---

## What messages can be sent?

There are five message types you can configure:

**Call summary / callback confirmation** — Sent after any lead enquiry where Q has taken the caller's details. Confirms someone will be in touch. Example: "Hi Sarah, thanks for calling Paul's Plumbing. Paul will be in touch shortly."

**Booking link** — Sent as an alternative to the call summary when you have an online booking system. Instead of promising a callback, Q sends the caller straight to your booking page. Example: "Hi Sarah, thanks for calling. Book your appointment directly here: [your link]"

**Address and detail confirmation** — Sent after a call where an appointment address was discussed. Asks the caller to confirm the details are correct. Example: "Hi Sarah, please confirm your booking: Tuesday 15th July at 10am at 17 High Street, Wigan WN1 1AA. Reply with any corrections or simply ignore to confirm."

**Booking confirmed** — Sent when a caller has booked. Confirms the booking is in place. Example: "Hi Sarah, your booking with Paul's Plumbing is confirmed. See you soon."

**Appointment reminder** — Sent before the appointment. This message requires a separate scheduled automation (Make.com or n8n) to trigger it. The message itself is configured here.

---

## Which channels can I send through?

Three channels are available:

**WhatsApp** — Sends from your own WhatsApp Business number. Callers receive a message from your business's WhatsApp account. Requires WhatsApp integration to be connected in the Integrations tab.

**SMS** — Sends as a standard text message via Twilio. The from number is a Qerxel shared number.

**Email** — Sends to the caller's email address if Q captured it during the call. Requires the caller to have provided their email.

Each message type can use a different channel. For example, you might send the call summary by WhatsApp but the detail confirmation by email.

---

## What are the template variables I can use?

When writing your message templates, use these placeholders — the system fills them in automatically from the call:

`{caller_name}` — The caller's name, as captured by Q during the call
`{business_name}` — Your business name from your Business Profile
`{lead_contact_name}` — The contact name from your Business Profile (your first name or team lead)
`{booking_link}` — Your online booking URL from your Business Profile
`{service_requested}` — The service the caller enquired about
`{appointment_address}` — The address the caller gave for the job or appointment
`{appointment_datetime}` — The date and time agreed during the call

If a variable has no value — for example, if the caller didn't give an address — the system leaves it blank rather than sending a broken message.

---

## Do I need to enable every message type?

No. Enable only the ones that make sense for your business.

For a typical tradesperson:
- **Call summary** — yes, this is the most important one
- **Booking link** — only if you take online bookings
- **Detail confirmation** — yes if Q regularly takes job addresses
- **Booking confirmed** — yes if Q confirms bookings on calls
- **Reminder** — yes, but needs the separate scheduled automation set up

For a business that does not use online bookings:
- Enable call summary and detail confirmation, leave booking link off

---

## What is the difference between the call summary and the booking link message?

They serve the same moment in the call — the caller just enquired about your service — but they take different actions:

- **Booking link** sends the caller to your online booking page. Use this if you have a booking system and want to reduce the need for you to call back.
- **Call summary** confirms someone will call them back. Use this if you prefer callbacks or do not use online booking.

The system sends only one of these per call. If you have the booking link message enabled and you have a booking URL in your profile, the system sends the booking link. If not, it falls back to the call summary.

---

## What is the default template for each message type?

If you leave a template blank, the system uses these defaults:

**Call summary:** `Hi {caller_name}, thanks for calling {business_name}. {lead_contact_name} will be in touch shortly.`

**Booking link:** `Hi {caller_name}, thanks for calling {business_name}. Book online here: {booking_link}`

**Detail confirmation:** `Hi {caller_name}, please confirm your details: {appointment_datetime} at {appointment_address}. Reply with any corrections or simply ignore to confirm.`

**Booking confirmed:** `Hi {caller_name}, your booking with {business_name} is confirmed. See you soon.`

**Reminder:** `Hi {caller_name}, just a reminder about your appointment with {business_name}. See you soon.`

You can customise any of these. Keep messages short — WhatsApp and SMS have character limits and callers respond better to brief messages.

---

## What triggers each message type?

The system decides what to send based on what happened in the call:

**Lead enquiry (call ended with a lead captured):**
- Sends booking link message (if enabled and you have a booking URL)
- OR sends call summary (if no booking URL, or booking link is disabled)

**Booking confirmed (call ended with a booking):**
- Sends call summary
- Also sends detail confirmation if the caller gave an address during the call

**Referred out (caller was sent to a partner):**
- Sends call summary

Messages are only sent for these three outcomes. Filtered calls, spam, and escalations do not trigger messaging.

---

## When does the reminder message send?

The reminder message does not send automatically based on the call — it sends before the appointment via a scheduled job. To use reminders:

1. Enable the reminder message type and configure the template
2. Ask support to set up the reminder automation for your account (Make.com or n8n scheduled to fire before appointments)

The reminder is sent to the appointment's `client_phone` at a time relative to `start_time` — typically 24 hours before and/or 1 hour before.

---

## What if the caller didn't give their name?

The `{caller_name}` variable defaults to "there" if Q didn't capture a name. So the message would read "Hi there, thanks for calling..." rather than showing nothing or an error.

If you want to avoid this, add "Please ask for the caller's name early in the conversation" to your Additional Instructions in AI Behaviour.

---

## Can I send a message to any channel for any message type?

Yes — each message type independently picks its channel. You might want:
- Call summary → WhatsApp (warm and personal)
- Detail confirmation → SMS (more formal, less likely to be missed)
- Booking confirmed → Email (for their records)

This is fine. Configure each one separately.
