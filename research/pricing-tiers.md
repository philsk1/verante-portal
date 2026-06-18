# QERXEL — PRICING TIERS
Generated 2026-06-17 for review. Source: CLAUDE-PRODUCTS.md + PlanSelector.jsx

---

## ANSWER (core product — AI call handling)

| Tier | Price | Notes |
|------|-------|-------|
| Free / PAYG | £0 base + usage | Pay-as-you-go. Entry point. |
| Light | £29 /mo | |
| Standard | £49 /mo | Most sole traders |
| Professional | £69 /mo | |
| Enterprise | £249 /mo | |
| Bespoke | TBC | |

**Included with every Answer tier:** Schedule Entry calendar (free, non-removable).

**Feature differences between Answer tiers — NOT YET DOCUMENTED in detail.**
Philip to confirm what each tier gets/loses (call minutes, catalogue item limits, SMS, staff limits, etc.)

---

## SCHEDULE (calendar & online booking)

Standalone product OR bundled with Answer.

| Tier | Price | Staff columns | Search depth | Messages /mo | Notes |
|------|-------|---------------|--------------|--------------|-------|
| Entry | Free | 1 | None | 0 | Free for life. Qerxel branding non-removable. Hook product. |
| Solo | £19 /mo | 1 | 3 months | 250 | Adds marketing intelligence + outbound messaging |
| Small Team | £29 /mo | 4 | 12 months | 500 | |
| Growth | £39 /mo | 8 | 24 months | 1,000 | |
| Large | £49 /mo | 20 | All time | 2,000 | |

**Notes:**
- Schedule-only customers (`subscription_tier = 'schedule_only'`) see Answer upsell strip in sidebar
- Q coaching points are suppressed for Schedule-only (no Answer = no call data to coach on)
- Booking page: free tier shows full Qerxel discovery card (non-removable). Paid Answer or multi-staff: branding available. Professional+: discovery card can be hidden. Footer attribution always shows.
- DB currently uses `calendar_tier = 'entry'` or `'multi'`. Full 5-tier split pending billing.

---

## LISTEN (real-time call copilot — add-on)

Activates on the owner's screen when they pick up a call themselves. Shows caller history, available slots, service suggestions. Creates bookings live during the call.

| Tier | Price | Included mins /mo | Overage |
|------|-------|--------------------|---------|
| Listen | £10 /mo | 100 mins | 3p /min |
| Listen Pro | £20 /mo | 250 mins | 4p /min |

**Dependency:** Requires Answer OR paid Schedule. Cannot stand alone.

**Cost to serve:** ~1.5p /min (Deepgram STT + Haiku inference). Strong margin.

**Listen Pro extras:** Catalogue hand-off — flags product enquiry mid-call, surfaces matching catalogue items, sends checkout link to customer. (Requires `product_url` field on `catalogue_items` — not yet added.)

**Status:** Listen tab exists in portal. Billing and activation logic not yet wired to payment page.

---

## SENTRY (booking reconciliation — add-on)

Compares physical station occupancy (CCTV) against Schedule appointments. Flags gaps for owner review.

| Cameras | Price |
|---------|-------|
| Up to 3 | £20 /mo |
| Up to 5 | £25 /mo |
| Up to 7 | £30 /mo |
| Up to 9 | £35 /mo |

**Dependency:** Requires Schedule (needs appointment data to reconcile against).

---

## COMBINED PRICING EXAMPLES

| Business | Products | Monthly total |
|----------|----------|--------------|
| Sole trader, no staff | Answer Standard + Schedule Entry (included) | £49 |
| Sole trader who takes some calls | Answer Standard + Listen | £59 |
| Hair salon, 3 staff | Answer Standard + Schedule Small Team | £49 + £29 = £78 |
| Hair salon, 3 staff + reconciliation | Answer Standard + Schedule Small Team + Sentry 3 cameras | £78 + £20 = £98 |
| Sole trader, Schedule only | Schedule Entry | Free |
| Sole trader, Schedule Solo | Schedule Solo | £19 |

---

## GAPS / OPEN QUESTIONS FOR PHILIP

1. **Answer tier features** — what specifically changes between Light / Standard / Professional / Enterprise? Call minute allowances? Catalogue item limits? SMS per month? Staff profile limits? These need to be defined before the payment page can be built properly.

2. **Listen on payment page** — currently missing. Philip flagged this. Where does it sit — as a standalone add-on card, or shown only after Answer is selected?

3. **Free PAYG Answer** — what are the per-call/per-minute rates? Not documented.

4. **Schedule bundled vs standalone** — when a customer buys Answer Standard, do they get Schedule Entry free OR can they upgrade Schedule separately on top? Is it Schedule Entry included, and then they pay to upgrade Schedule tier separately?

5. **Listen Pro** — `listen_tier = 'pro'` not yet added to DB. Needs to be added when billing goes live.

6. **Sentry camera limits** — stored as `sentry_camera_limit` on tenants. Wired to tier or manually set?

7. **Enterprise / Bespoke** — no feature list documented. Presumably everything + white glove setup. Needs definition before it appears on a public pricing page.
