# Qerxel Mobile App — Decisions Log
Date: 2026-06-17

## What we decided

### What the app is NOT
Not a portal replacement. Not a configuration tool. Not analytics on a small screen. Those stay on desktop.

### What the app IS
A lead notification and callback hub for business owners who are physically working and cannot be at a desk.

### Phase 1 — WhatsApp notifications (start here, low cost, fast)
Wire Twilio WhatsApp Business API so Q sends a WhatsApp message the moment a call is handled.
Message format: caller name, lead type, urgency signal, phone number.
Owner taps to call back.
Delivers 80% of mobile value with near-zero build time.
Twilio is already in the stack — just needs WhatsApp Business approval from Meta (3–7 days).

### Phase 2 — React Native companion app
Five functions only:
1. Push notification on every Q-handled call
2. Lead feed — today's calls with AI summary, scrollable
3. Tap to callback — dials from business number via Twilio
4. Tap to play call recording
5. Status toggle — Available / Busy / Away (tells Q whether to transfer or handle fully)

### UI concept
Default view: calendar. Horizontal scroll through days. Vertical scroll through time slots.
Swipe gesture reveals left panel: action feed showing leads, unconfirmed bookings, anything needing a decision right now.
Confirm bookings directly from calendar view.
No config anywhere in the app. Pure operational live data.

### Build approach
React Native (cross-platform — iOS and Android from one codebase).
NOT a PWA — iOS "Add to Home Screen" friction too high for this audience.
App Store presence matters for trust with non-technical market.
Free app or £1 nominal charge to avoid App Store commission while maintaining store presence.

### What's needed before building
- Apple Developer Program account: £79/year (Philip to set up — needs Apple ID, 24–48hr approval)
- Google Play Console account: $25 one-time (Philip to set up — faster approval)
- Twilio WhatsApp Business API: enable in Twilio console, Meta approval 3–7 days (start this first — longest lead time)

### Competitor context
Allo (EU) raised $12M (Lightspeed/Base10) for a mobile-first AI business phone at €14/month.
Generic, shallow, not UK-specific, not trades-specific. Not a significant threat at Qerxel's intelligence depth.
Validates the market at venture scale.

### Decision: finish portal work before starting app build
