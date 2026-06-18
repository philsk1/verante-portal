# Troubleshooting

## Q is not answering calls

**Check 1 — Call forwarding is set up**
Q can only answer calls that are forwarded to your Qerxel number. If you have not set up call forwarding, calls go to your normal voicemail instead. Test by calling your main business number from another device with your main phone switched off — if you get voicemail, call forwarding is not active. See KB-GETTING-STARTED.md for the forwarding codes for your network.

**Check 2 — Your Qerxel number has been assigned**
Your account needs a Qerxel phone number linked to it. If the "Phone number assigned" item on your dashboard readiness checklist is not green, your number has not been set up yet. Contact support.

**Check 3 — You have saved your AI settings at least once**
Q needs a saved configuration before it can answer calls. Go to AI Behaviour and click Save AI Settings. Wait for the sync chip to confirm it completed.

---

## Q answered but said something wrong

**The most common causes:**

1. **Business Profile is incomplete** — Q improvises if information is missing. Fill in your business name, opening hours, business context, and contact name.

2. **Services are not in the catalogue** — If Q doesn't know what you offer, it can't describe your services accurately. Add your services to the Catalogue tab.

3. **Additional Instructions contain contradictory rules** — Check your Additional Instructions in AI Behaviour for anything that might conflict. Keep each instruction to one sentence.

4. **The call type rule is misconfigured** — If Q is handling a new customer call as if it were a sales call, check your Call Handling Rules for that call type.

**To diagnose:** Go to Listen → find the call → read the full transcript. The transcript shows exactly what was said and gives you the context to identify where Q went wrong.

---

## Q sent a message to the wrong person or no message arrived

**If no message arrived:**
- Check that after-call messaging is enabled in AI Behaviour → After-call Messaging
- Check that the correct channel (WhatsApp, SMS, Email) is selected for that message type
- If using WhatsApp: check that your WhatsApp integration is connected in Integrations
- If using Email: Q only sends emails if the caller provided their email during the call
- Check the call's triage outcome — messages only fire for `lead_captured`, `booked`, and `referred_out`

**If a message went to the wrong person:**
After-call messages are sent to the caller's phone number from the call. If you have test call numbers or fake numbers in your contacts, they may receive messages. This is expected behaviour — Q sends to whoever called.

**If the template variables weren't filled in:**
If a message shows `{caller_name}` literally instead of the caller's name, Q did not capture that information during the call. Add "Please always ask the caller for their name early in the conversation" to your Additional Instructions.

---

## The demo call button says "Save and sync your AI settings first"

Q's demo call uses your real AI configuration — not a generic demo. This means the sync must have completed successfully at least once before you can test.

1. Fill in your Business Profile (at minimum: business name, contact name, opening hours)
2. Go to AI Behaviour and click Save AI Settings
3. Wait for the sync chip to show "Synced" or a tick
4. Try the demo call again

If Save AI Settings gives an error, check that your Qerxel account is fully set up. Contact support if the error persists.

---

## The demo call says "Demo calling not yet configured"

This means the VAPI_DEMO_PHONE_NUMBER_ID environment variable is not set on the server. This is an internal configuration issue — contact support.

---

## A caller says they are getting voicemail instead of Q

**The most likely cause is that call forwarding is not set up correctly.**

The most common mistake: setting up "unconditional forwarding" (all calls go to Q regardless of whether you answer) when you intended to set up "conditional forwarding" (Q only answers when you don't). Or vice versa.

UK mobile forwarding codes:
- `**61*[Qerxel number]#` — forward when no answer (most common setup)
- `**62*[Qerxel number]#` — forward when phone is switched off or no signal
- `**67*[Qerxel number]#` — forward when you are on another call
- `*21*[Qerxel number]#` — forward all calls (Q answers everything)

Check which code your carrier uses — they vary slightly between networks. Your carrier's customer support can verify what is currently configured.

---

## Q is granting callers things it should not

This usually means the Additional Instructions contain a statement that is too permissive. For example: "Always help callers" could cause Q to help callers it should decline.

Check your Additional Instructions, call type rules, and banned services list. Make sure declined services are in the banned services list.

Also check that the call type mode for the relevant call type (e.g. Sales Call) is set to Strict.

---

## Q is refusing callers it should be helping

**Check 1 — Is the service in your catalogue?** If someone asks about a service that is not listed, Q may decline it or say you do not offer it.

**Check 2 — Is the service accidentally in the banned services list?** Go to AI Behaviour → Banned/Partner Services and check nothing has been added incorrectly.

**Check 3 — Are the call type rules set correctly?** If new customer calls are set to Strict mode, Q will be less helpful than intended. New customers should typically be Open mode.

---

## Q misidentified a spam call as a real one (or vice versa)

**If Q is blocking real callers:**
Turn off the spam filter in AI Behaviour → Caller Intelligence → Spam Filter. If this resolves it, the Nomorobo database may have incorrectly flagged a real number. You can report false positives to Nomorobo.

**If Q is answering spam calls that should be blocked:**
Check that the spam filter is enabled. If it is and spam is still coming through, the specific number may not yet be in Nomorobo's database. Add it to your blocked numbers list manually.

---

## The calendar is not showing appointments from online bookings

**Check 1 — Is the booking page active?** Go to Account Settings and check your booking page status.

**Check 2 — Is the calendar tier set correctly?** Online bookings require an active calendar tier. If calendar_tier is 'none', the booking page is inactive.

**Check 3 — Are your services and staff listed with availability set?** The booking page requires services with durations and at least one staff member with availability hours configured. Without these, no slots can be generated and customers cannot complete a booking.

---

## I can see a call in the log but the outcome seems wrong

Read the full transcript to understand what actually happened. Then check:

1. Did the caller clearly state their intent? If they were vague, Q may have misclassified the call.
2. Are your call type rules clear enough? Ambiguous rules produce ambiguous outcomes.
3. Did the caller say something Q interpreted as an emergency keyword? This triggers escalation regardless of context.

If outcomes are consistently wrong for a particular call type, revisit the rules for that call type and add a specific instruction to your Additional Instructions field.

---

## I do not recognise a team member on a call

Check your staff directory. If a number you don't recognise is listed against a team member, that team member's profile has an incorrect phone number. Update it in the Business tab → Staff.

---

## My session keeps expiring and I have to log in again

Sessions expire after a period of inactivity. This is a Supabase Auth setting. If it is happening too frequently for your workflow, contact support — the session duration can be adjusted.

---

## A client says they can't cancel their appointment using the link in their email

**Possible causes:**
- The link has expired (very old bookings may have expired cancel tokens)
- The appointment has already been cancelled
- The cancellation cutoff has passed (if you have a cutoff set, cancellations within that window are blocked)

Ask the client to contact you directly if the link isn't working.
