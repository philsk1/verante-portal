# Call Handling Rules

## What are call handling rules?

Call handling rules tell Q exactly what to do when it identifies what type of call it is dealing with. Every call Q receives is classified into one of five types, and your rules determine how Q responds to each one — how open or firm to be, whether to offer a booking link, whether to offer a callback, and whether to take an email address.

You set these rules once and Q applies them consistently on every call. You can override the defaults for any call type.

## What are the five call types?

**New customer** — Someone calling to enquire about your services who has not used you before. This is your most important call type. Q should be warm, explore their needs, and move towards a booking or lead capture.

**Partner service** — A caller who needs something you do not offer, but which one of your referral partners does. Q should identify this quickly, name the right partner, and close the call cleanly.

**Sales call** — Someone trying to sell something to your business. Q should be polite but firm and close the call quickly. These calls waste your time and your call minutes.

**Supplier / delivery** — A call from someone delivering goods or chasing an order. Q should take their name and the reason for the call, and confirm someone will follow up.

**Invoice / official / authorities** — A call from a finance company, local authority, HMRC, or similar. Q should take the caller's name, organisation, and the nature of the contact, and confirm the owner will be in touch.

## What does the Mode setting do for each call type?

Each call type has a mode — Open, Balanced, or Strict — that controls how Q handles that type of call regardless of your overall triage mode setting.

**Open** — Q is conversational and exploratory. It takes time with the caller and tries to understand their full situation before closing. Best for new customer calls.

**Balanced** — Q is warm but efficient. It gathers what it needs and closes with a clear next step. Good for supplier and invoice calls.

**Strict** — Q is brief, professional, and closes quickly. Best for sales calls where the goal is to end the conversation politely but without encouraging further dialogue.

## Can Q send the booking link to callers?

Yes. For each call type, you can toggle the booking link on or off. When it is on, Q will offer your booking link as a closing action — "I will send you our booking link" or "You can book directly at our website."

The link it sends is the one set in your business profile. If you have not set a booking link, this option has no effect.

For new customer calls, the booking link is on by default. For sales calls and deliveries, it is off. You can change any of these defaults.

## Can Q offer a callback?

Yes. For each call type, you can enable the callback option. When it is on, Q offers a callback from the owner as a closing option — "I'll make sure [your name] calls you back shortly."

The timing of that callback is set by your Callback Preference Note in AI Behaviour settings. If you leave this blank, Q says "as soon as possible." If you write "within two hours on working days," Q uses that.

Enable callbacks for new customer and partner service calls. It is usually not appropriate for sales calls.

## Can Q take email addresses?

Yes, per call type. When email capture is on, Q asks for the caller's email address and logs it. If you set an email address for that call type, Q will tell the caller you are passing their details to a specific person or email.

This is useful for invoice and official calls — you might want those to go to your accountant's email rather than your own.

## What should I write in the Custom Instructions field for each call type?

Custom Instructions are optional per-call-type rules that override or add to Q's default behaviour for that call type only.

**Example for new customer calls:** Always ask if the caller has used us before. If they have, mention we offer a 10% loyalty discount on their next booking.

**Example for sales calls:** If the caller mentions website design or SEO, end the call immediately.

**Example for invoice calls:** These should be forwarded to accounts@mybusiness.com — make sure to capture the company name and reference number.

Keep these short and specific. Q follows them as direct instructions.

## What is a triage outcome and why does it matter?

Every call Q handles ends with a triage outcome — a single label that tells you what happened. The outcome is visible in your call log alongside the AI summary and full transcript.

The outcomes are:

- **lead_captured** — A new customer enquired, gave their details, and is interested. Action needed: follow up.
- **booked** — The caller booked or provisionally booked an appointment.
- **referred_out** — The caller needed something a partner offers. Q gave them the partner's details.
- **filtered** — A sales call, wrong number, or out-of-scope enquiry. Closed cleanly by Q.
- **escalated** — An urgent call or official enquiry. You were notified immediately.
- **hard_close** — A caller who could not be helped. Q declined and ended the call.
- **spam** — An automated or nuisance call. Q ended it.

These outcomes power your analytics — conversion rates, referral tracking, and call quality scores are all calculated from them.
