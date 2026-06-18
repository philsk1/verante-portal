# Calendar and Appointments

## What is the Calendar for?

The Calendar is your appointment management system. It shows all your bookings in a visual timeline, lets you create and edit appointments manually, and receives bookings from your online booking page.

If you have AI call handling, appointments created via Q (provisional bookings) also appear here for your review.

---

## What view options does the Calendar have?

The calendar has multiple view modes:
- **Day view** — shows one day in detail, with time slots visible
- **Week view** — shows the whole week at a glance
- **Month view** — overview of the whole month
- **Staff column view** — shows all team members side-by-side for the same time period (multi-staff tier)

Switch between views using the controls at the top of the calendar.

---

## How far back and forward can I see?

The calendar shows 13 months back and 2 months ahead by default. As you navigate past these boundaries, the window extends automatically.

This means you can always see the full previous year of appointments — useful for reviewing last year's work, checking when a client last came in, or understanding seasonal patterns.

---

## How do I create an appointment manually?

Click any empty slot in the calendar. A form appears to fill in:
- **Title** — who the appointment is for (set automatically if you use the client and service fields)
- **Client name and contact details** — phone and email
- **Service** — select from your catalogue
- **Staff member** — who will do the appointment
- **Date and time** — auto-filled from where you clicked
- **Status** — starts as confirmed unless you choose provisional

Click Save to create the appointment. It appears immediately in the calendar.

---

## What appointment statuses are there?

**Provisional** — The appointment is tentative. Not yet confirmed with the client. Used when Q has offered a slot during a call and you need to confirm with the client before finalising.

**Confirmed** — The appointment is fixed. The client knows about it and has agreed. This is the status for most bookings after they are verified.

**Completed** — The appointment has happened. Marking appointments as completed keeps your history accurate and powers your performance analytics.

**Cancelled** — The appointment was cancelled by either the client or you. Cancelled appointments remain in the calendar for record-keeping.

**No-show** — The client did not attend and did not cancel. Tracking no-shows allows the Q Intelligence features to identify repeat no-show clients.

---

## What is a Provisional booking and how is it different from Confirmed?

A provisional booking is an appointment that has been offered but not yet confirmed. Q can offer provisional slots during calls if you have the provisional booking feature enabled. These appear in the calendar so you can see them, but they should be confirmed (or cancelled) quickly — ideally by calling the client to confirm.

The distinction matters for your analytics. Provisional appointments that convert to confirmed are a positive signal. A high rate of provisional-to-cancelled means either Q is offering poor slots or clients are changing their minds after calls.

---

## How does the booking page create appointments?

When a customer books through your public booking page (`/book/:tenantId`), they:
1. Choose a service
2. Choose a date and available time slot
3. Enter their name, phone, and email
4. Confirm the booking

The system creates an appointment with status `confirmed` and `created_from = 'customer_booking'`. A confirmation email is sent to the customer with a link they can use to cancel or reschedule.

The appointment appears in your calendar immediately.

---

## What is a cancel token and what is it used for?

Every appointment has a unique cancel token (a random UUID). This token is included in the confirmation email to the customer as a link like `/manage-booking/[token]`.

When the customer clicks this link, they can:
- Cancel the appointment (updates status to `cancelled`)
- Request a reschedule (links back to the booking page)

You do not need to manage cancel tokens — the system handles them automatically.

---

## What are appointment reminders and how do I set them up?

Appointment reminders are automatic messages sent to clients before their appointments. Two types:
- **24-hour reminder** — sent the day before
- **1-hour reminder** — sent an hour before

The reminder message templates are configured in the After-call Messaging section of AI Behaviour.

To activate reminders, the automated job must be set up (Make.com or n8n cron). Contact support to have this configured for your account. Once active, reminders send automatically — no action needed from you.

Sent status is tracked on each appointment (`reminder_sent_24h`, `reminder_sent_1h`). If a reminder fails to send for any reason, it will not retry automatically — but the next cron run checks for any that were missed.

---

## What is the Booking Buffer?

The booking buffer is the minimum time between the current moment and the earliest slot a customer can book online. It is set in minutes.

**Example:** Buffer = 120 minutes. If a customer tries to book online at 2pm, the earliest available slot shown is 4pm.

This prevents same-day last-minute bookings that you might not be able to prepare for. Most businesses set between 60 minutes (very responsive) and 24 hours (1440 minutes, next-day earliest).

---

## What is the Cancellation Cutoff?

The cancellation cutoff is how many hours before an appointment a client can cancel online (via their manage-booking link). If they try to cancel within this window, they are shown a message to contact you directly.

**Example:** Cutoff = 24 hours. A client with a Friday 10am appointment can cancel online up to Thursday 10am. After that, they must call.

This works alongside your no-show and late cancellation policies (if configured).

---

## What is a No-Show Fee?

If you charge a fee for clients who do not attend without cancelling, you can configure this in the booking settings. Two types:
- **Fixed amount** — a specific pound value
- **Percentage** — a percentage of the service cost

Currently this setting records the policy — the actual fee collection is handled by you directly (or will be handled via payment deposits, a planned feature). The no-show fee configuration ensures the policy is displayed to clients at the time of booking.

---

## How do I see a client's booking history?

In the Calendar, click on any appointment to see the client details. From there you can see their phone and email.

For a complete view of a specific client's history, go to Client Directory → find the client → their appointment history and call history are shown together.

---

## Can the Calendar sync with Google Calendar?

Google Calendar sync is configured as an integration (OAuth) but is not yet active. When live, it will provide two-way sync — appointments created in Qerxel appear in Google Calendar, and events in Google Calendar block out time in the Qerxel booking page.

---

## What does Calendar Intelligence show?

Calendar Intelligence (a sub-section of the Calendar) provides analytics on your scheduling patterns:
- Busiest days and times
- Most popular services
- Staff utilisation
- Booking lead time (how far in advance clients typically book)
- No-show and cancellation rates

This data is drawn from your appointment history and updates in real time as appointments are created and completed.
