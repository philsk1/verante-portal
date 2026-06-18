# Services and Catalogue

## What is the difference between Services and Catalogue?

The portal has two ways to add what you offer:

**Services** is the simple list — just service names. Q uses it to know what topics to handle and which calls to triage as relevant.

**Catalogue** is the full version — each item has a name, description, price range, duration, and category. When you add catalogue items, Q uses them instead of the simple services list. Q can describe each service in detail, give price guides, and tell callers how long appointments take.

Use the Catalogue if you have online booking enabled or if your services need descriptions and prices. Use the Services list if you just need Q to know what you do without the detail.

---

## What should I put in the Service/Item Name?

Use the name your callers use — not an internal code or technical term. If your customers say "boiler service" not "gas appliance maintenance", write "boiler service."

Q matches callers to services using natural language. The name does not need to be exact — Q is intelligent enough to understand "central heating repair" and "boiler fix" as the same thing if they are in the same category. But using common customer language means Q responds more naturally.

---

## What is the Description field for?

The description is what Q knows about the service. Write it as if you are explaining the service to someone who has never heard of your business.

Good description: *Gas Safe registered boiler servicing. Includes full inspection, efficiency check, and safety certificate. Required annually for landlords.*

Poor description: *See internal handbook section 4.2.*

Q uses this description when callers ask questions like "what does that include?" or "is that for commercial properties too?" The more detail you give, the more confidently Q can answer.

---

## What is the Price From and Price To for?

These are the price range for the service — the minimum and maximum you typically charge. Q uses them to give callers a rough guide when asked.

**Price From only (Price To blank):** Shows as "from £X" — use for services with a starting price that varies based on job specifics.
**Both From and To:** Shows as "£X–£Y" — use for services within a defined range.
**Both blank:** Q does not mention a price and says you would need to assess the job first.

**Important:** For businesses where prices depend on the job (most trades), Q always follows any price mention with "That's a rough guide — [your name] would need to see the job to give you an accurate quote." You cannot turn this off because it protects you from being held to an AI-stated price.

---

## What is Duration for?

Duration is how long the service takes, in minutes. The calendar uses this to block out the right amount of time when an appointment is created — Q does not mention duration to callers unless they ask.

If your service times vary significantly, use an average or the typical job length. You can always adjust individual appointments in the calendar.

---

## What is Processing Minutes?

Processing minutes is the additional time after the service is complete where the client needs to remain but the staff member is free to take another booking. This is used in salons and clinics:

A hair colour treatment might take 30 minutes of active work + 45 minutes of processing time. With `duration_minutes = 30` and `processing_minutes = 45`, the calendar:
- Blocks 30 minutes for the stylist (they can take another client during processing)
- Blocks the full 75 minutes for the appointment slot (client is still on site)

Leave blank if all your services require continuous staff time.

---

## What is the Category field?

Category groups services in the booking page and the admin catalogue view. Use categories that make sense to customers — "Boiler Work", "Gas Safety", "Plumbing" rather than "Product Type A", "Type B".

If you only have a few services, categories are optional.

---

## What is Internal Notes?

Internal Notes is visible only in the portal — to you. Q never reads it and callers never see it. Use it for:
- Supplier information (where you order the parts)
- Staff allocation (which team member typically does this service)
- Commission rates
- Anything else you want to remember about the service

---

## Can I link a service to a supplier?

Yes — each catalogue item can be linked to a supplier from your supplier directory. This is used by the Business Desk feature to generate one-click order links for supplies needed for a service.

For example: a plastering service linked to your plasterboard supplier. When you prepare for a job, you can quickly reorder materials from the linked supplier.

---

## What is the Product URL field?

Product URL is a web address that links to a checkout page or product information page for this item. It is used by the Listen Pro feature — when you are on a call and a customer enquires about a product, Listen can display the URL and send it to the customer directly.

This is most relevant for businesses that sell products as well as services — for example, a beauty salon that also sells retail products, or a gym that sells supplements.

---

## Should I mark items as inactive instead of deleting them?

Yes. When a service is no longer available, set it to inactive rather than deleting it.

Active items:
- Appear in the booking page
- Are injected into Q's system prompt (Q knows about them)
- Count toward your catalogue view

Inactive items:
- Do not appear in the booking page
- Are NOT injected into Q's prompt (Q won't mention them)
- Are preserved in the database for historical reference

If a service is temporarily unavailable (seasonal, or waiting for equipment), set it inactive and re-enable it later.

---

## How many catalogue items can I have?

There is no system limit. Practically, if you have more than about 30 active services, Q's system prompt becomes very long. This is rarely an issue for sole traders and micro-businesses, which typically have 5-20 services.

If you have a very large catalogue (30+), consider deactivating services that are rarely enquired about and only activating them when relevant.

---

## How do catalogue items connect to call handling?

When Q's system prompt is built before each call, it includes all active catalogue items with their names, descriptions, price ranges, and durations. Q uses this to:

- Answer "what services do you offer?" questions
- Identify which service a caller is asking about
- Give approximate prices when asked (with the mandatory quote caveat)
- Assign the correct `service_requested` to the structured call data after the call

The `service_requested` from Q's structured data is also used in after-call messages as the `{service_requested}` template variable.
