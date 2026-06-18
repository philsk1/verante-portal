# Caller Intelligence

## What is caller intelligence and why does it matter?

Caller intelligence is Q's ability to recognise who is calling before the conversation starts. When Q knows a caller, it greets them by name, references their history, and adjusts its behaviour for that type of caller. A returning customer gets a warm personal welcome. A supplier gets a brief, targeted greeting. A staff member gets an informal acknowledgement.

This happens in the fraction of a second before Q speaks. The caller experiences it as naturally knowing who they are — not as a system looking them up.

---

## How does Q know who is calling?

Q runs through a priority chain before each call:

**1. Spam check** — Q checks the caller's number against Nomorobo's database of known spam and autodialler numbers. If a match is found, Q rejects the call silently before it even connects. No voicemail, no engagement.

**2. Blocked numbers** — If you have added the caller's number to your blocked list, Q ends the call immediately with a polite decline.

**3. Known supplier** — Q checks your supplier directory. If the caller's number matches a supplier, Q greets them as a supplier and handles the call accordingly.

**4. Referral partner** — Q checks your referral partner list. If the caller is a partner business, Q handles the call as a B2B contact.

**5. Your staff** — Q checks your team directory. If the caller is one of your team members, Q greets them by first name and handles the call as internal.

**6. Returning customer** — Q checks your contacts list. If the number matches a known customer, Q personalises the greeting and references their last service.

**7. Appointment records** — If the caller isn't in your contacts but has booked with you before, Q finds the appointment record and treats them as a returning customer. This catches people who booked online but were never manually added as contacts.

**8. Unknown** — If none of the above match, Q treats the caller as a new enquiry and uses the standard greeting.

---

## What does Q say to a known returning customer?

If Q recognises a customer, it replaces the standard greeting with something like:

*"Paul's Plumbing. Hi Sarah! Are you looking to rebook your boiler service, or is there something else I can help with?"*

This is built from the caller's name and their last appointment type. If Q doesn't know their last service, it says: *"Hi Sarah! How can I help you today?"*

Customers with five or more visits are flagged internally as frequent clients and Q adjusts its tone to reflect the established relationship.

---

## How does Q handle a known supplier?

Q greets the supplier by their company name and directs the conversation to deliveries or account matters. It takes their name and reason for calling and promises a follow-up from the owner. Q does not discuss pricing, margins, or internal order details.

---

## How does Q handle a referral partner?

Q greets them as a B2B caller and confirms which partner business they are from. It takes a message and offers a callback from the owner. Q doesn't try to handle the conversation as a customer enquiry — it keeps it brief and professional.

---

## How does Q handle a staff member calling in?

Q greets them by first name and handles it as an internal call. It takes any message they want to pass on and confirms it will be relayed to the owner.

---

## What is the spam filter and how does it work?

The spam filter is powered by Twilio Lookup with the Nomorobo add-on. When a call comes in, Q sends the caller's number to Nomorobo's database for a score check. A score of 1 means the number is a confirmed spam or autodialler number.

If the caller is confirmed spam, Q rejects the call before it is answered. No ring, no greeting, no voicemail — the call simply does not connect.

**Important:** The spam filter fails open. If the check times out or fails for any reason, Q answers the call normally. A real customer is never blocked because a spam check timed out.

You can turn the spam filter off entirely in AI Behaviour settings if it is blocking legitimate calls.

---

## How do I add someone to my blocked list?

Go to AI Behaviour → Number Blocking. Enter the phone number in the list. You can enter numbers in any standard UK format — +447... , 07... , or with spaces.

Once added, any call from that number receives a brief, polite decline: "I'm sorry, we're unable to take calls from this number." The call is logged but not engaged with.

Use this for callers who have specifically asked not to be contacted, or numbers that are persistently nuisance calls not caught by the spam filter.

---

## Can Q identify callers who booked online but never called before?

Yes. Q checks your appointment records by phone number as well as your contacts list. If someone booked through your online booking page but has never called your Qerxel number, Q will still recognise them on their first call and greet them as a returning customer, referencing their booking history.

This closes the gap between your booking customers and your calling customers — giving all returning clients the same personalised experience.

---

## How does Q know the caller's name without them saying it?

Q checks the caller's phone number against your contacts list and appointment records. If a name is on file, Q uses it in the personalised greeting before the caller says a word.

If Q doesn't have a name on file, it uses the standard greeting and captures the name during the conversation.

---

## What information does Q see about a returning customer?

Q sees:
- Their name (from contacts or last appointment record)
- Number of visits on record
- Their last service type and the approximate date
- Whether they are flagged as a hot prospect

Q does NOT see:
- Their payment history
- Internal notes (not shown to AI)
- Transcript of previous calls (no cross-session memory)

---

## Does Q share the caller's history with them?

Not explicitly. Q uses the information to personalise its greeting and make relevant suggestions — "looking to rebook your boiler service?" — but it does not read out the caller's history to them or describe what it knows. This keeps the interaction natural rather than making callers feel surveilled.

---

## What happens when Q detects an opt-out request?

Q scans every call transcript for phrases indicating the caller wants to stop being contacted — "remove me from your list", "unsubscribe", "take me off your records", "don't contact me", etc.

If Q detects one of these phrases, it automatically marks the caller's record as opted out of marketing and flags a deletion request. Philip (or whoever manages the account) can review these in the Contacts view.

This is Qerxel's built-in GDPR compliance for unsolicited contact requests — it happens without any action needed from the business owner.
