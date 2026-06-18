# Phone Numbers and Call Connections

## How does Qerxel connect to my phone calls?

Qerxel does not replace your existing phone number. It works alongside it. Here is how:

1. You have your existing business number (your mobile, your landline, your VoIP number — whatever callers ring)
2. Qerxel assigns you a separate Qerxel number (a standard UK number)
3. You set up call forwarding: when your business number is not answered (or whenever you choose), calls forward automatically to your Qerxel number
4. Q answers on your Qerxel number and handles the conversation
5. Call logs, transcripts, and outcomes appear in your portal

Your callers still ring the same number they have always rung. They are unaware the call is being forwarded.

---

## What is a Qerxel number?

Your Qerxel number is a UK phone number (01/03/07 prefix) provisioned specifically for your account in Qerxel's voice platform (Vapi). It is the number calls are forwarded to when Q is intended to answer.

Your Qerxel number appears in your portal on the Phone Lines page (or is shown to you when assigned by support). You do not need to publicise this number — it is for internal use.

---

## How do I set up call forwarding?

Call forwarding directs calls from your main business number to your Qerxel number. The most common setup is conditional forwarding — Q only picks up when you do not answer.

**UK mobile forwarding codes (works on EE, O2, Vodafone, Three, and most MVNOs):**

Forward when not answered (most common — Q picks up after a few rings if you don't):
```
**61*[your Qerxel number]#
```

Forward when your phone is switched off or out of signal:
```
**62*[your Qerxel number]#
```

Forward when you are already on another call (busy):
```
**67*[your Qerxel number]#
```

Forward all calls (Q always answers, you never ring):
```
*21*[your Qerxel number]#
```

**To cancel any conditional forward:**
```
##61#   (cancel no-answer forward)
##62#   (cancel switched-off forward)
##67#   (cancel busy forward)
```

**To cancel all call forwards:**
```
##002#
```

Replace `[your Qerxel number]` with the number in E.164 format — for example `+441234567890` or `441234567890` (the # usually handles the format). Some networks want just the local number `01234567890`.

---

## What about VoIP or landline numbers?

If your business number is a VoIP number (through a provider like RingCentral, 3CX, Gamma, or similar), call forwarding is usually configured in your VoIP account dashboard, not on a handset.

If you have a BT landline, call forwarding is set up through BT. Call BT Business and ask to set up conditional call forwarding to your Qerxel number.

If you use a cloud business phone system (Vonage, 8x8, etc.), the call routing rules are set in their portal. Look for "Call Forwarding", "Ring Groups", or "IVR settings" and add your Qerxel number as the fallback when no one answers.

---

## How do I test that Q is answering?

Once call forwarding is set up:
1. Use a second phone (your personal mobile) to call your business number
2. Let it ring without answering
3. After a few rings, Q should pick up and greet you

If you get voicemail instead of Q, call forwarding is not active or is pointing to the wrong number. Double-check the forwarding code you used.

You can also use the "Call me now" button in AI Behaviour to test Q directly without going through your business number.

---

## What is Vapi?

Vapi is the voice platform that powers Q's phone conversations. When a call arrives at your Qerxel number, Vapi:
- Receives the call
- Fires a request to Qerxel's servers to fetch your current AI configuration
- Handles the conversation (speech-to-text, AI reasoning, text-to-speech)
- Sends the call summary and transcript to Qerxel at the end

Vapi is invisible to you — you only see its outputs in your portal. You do not need a Vapi account or any Vapi credentials.

---

## What is Deepgram?

Deepgram Nova-2 is the speech-to-text engine that transcribes what callers say during conversations with Q. It converts the caller's voice to text in real time so the AI can understand and respond.

Deepgram is embedded in the Vapi platform — you do not interact with it directly.

---

## What voices does Q use?

Q's voice is provided by one of two services:
- **Cartesia Sonic** — a natural-sounding voice used for standard and premium tiers
- **Deepgram Aura** — a backup voice used if Cartesia is unavailable

The voice is selected based on your subscription tier:
- Standard tier: Cartesia standard voice
- Premium tier: Cartesia premium voice (slightly different characteristics)

You can change the speech pace (slow, natural, fast) in AI Behaviour. The underlying voice does not change.

---

## Does Q use my phone data or minutes?

No. Q operates entirely in the cloud. The call goes from your business number to your Qerxel number, which is handled by Qerxel's systems. Your mobile or landline plan is used only for the initial forwarding leg — from your number to the Qerxel number. This leg is typically counted as a standard outbound call by your carrier and uses whatever minutes or data are in your plan.

Qerxel's call minutes (included in your subscription) are separate from and in addition to whatever your phone provider charges for the forwarding leg.

---

## What happens if Q is unavailable or has an outage?

If Q's systems are unavailable when a call arrives, the call will fail to connect to Q. Depending on your call forwarding setup, the call may then fall through to your voicemail or simply ring out.

Qerxel is built on Vercel's serverless platform and Supabase's managed infrastructure. Both have high availability guarantees. Vapi (the voice platform) has its own availability SLA. Outages are rare but possible.

If you notice Q is not answering calls, check:
1. Your call forwarding is still active (sometimes carriers reset it)
2. The Qerxel status page or contact support
