# Integrations

## What integrations does Qerxel support?

Qerxel integrates with external services across three categories:

**Messaging:** WhatsApp Business, SMS (via Twilio), Email (via Resend)
**Accounting:** FreeAgent, Xero
**Calendar:** Google Calendar
**Automation:** Zapier, Make.com
**Reviews:** Google Business Profile (planned)

Most integrations are configured in the Integrations tab. Some require external account setup before they can be connected.

---

## How do I connect WhatsApp?

WhatsApp messaging uses the Meta Cloud API. This means the messages Q sends to callers come FROM your own WhatsApp Business number — not from a Qerxel number. The caller receives a WhatsApp from your business.

**What you need before connecting:**
1. A WhatsApp Business account (free from Meta)
2. A Meta Developer account (free)
3. A Meta App with WhatsApp Business API enabled

**Steps:**
1. Create a Meta App at developers.facebook.com
2. Add WhatsApp Business to the app
3. Verify your business phone number as a WhatsApp Business number
4. Generate a permanent access token in Meta's system
5. Note your `phone_number_id` (shown in the Meta developer portal)
6. Go to Integrations → WhatsApp → enter your phone_number_id and access_token
7. Click Connect

After connecting, send a test message from the Integrations tab to confirm it is working.

**Important:** Meta requires messages to be sent from an approved number. If you change your business phone number, you need to reconnect WhatsApp.

---

## What does WhatsApp let Q do?

With WhatsApp connected:
- Q sends after-call messages via WhatsApp when you have it selected as the channel
- The message appears as coming from your WhatsApp Business number
- Callers can reply to the WhatsApp (but replies are not automatically routed back into Qerxel — you manage them in your WhatsApp app)

Configure which message types go via WhatsApp in AI Behaviour → After-call Messaging.

---

## What is Zapier and when should I use it?

Zapier is an automation platform that connects apps together. With the Zapier integration, Qerxel can fire a webhook to Zapier every time a lead is captured.

**Use cases:**
- Add new leads to a Google Sheet automatically
- Create a task in your project management tool when a lead comes in
- Send yourself a Slack message for every new lead
- Add the lead to a CRM (HubSpot, Pipedrive, etc.)

**To connect Zapier:**
1. Create a Zapier account
2. Create a Zap with a "Catch Hook" trigger (Zapier gives you a webhook URL)
3. Paste the webhook URL into Integrations → Zapier → Webhook URL
4. Click Save

Zapier receives a payload containing: caller_phone, caller_name, call_outcome, timestamp.

---

## What is the FreeAgent integration?

FreeAgent is a UK accounting platform popular with sole traders and freelancers. The Qerxel integration allows you to:
- Connect your FreeAgent account via OAuth
- Create invoices in FreeAgent from completed appointments

This is a manual trigger — you choose which appointments to invoice and click to create the invoice in FreeAgent. Qerxel does not create invoices automatically.

**To connect:** Go to Integrations → FreeAgent → Connect. You are redirected to FreeAgent to authorise the connection. Once authorised, return to the portal — the connection is established.

---

## What is the Xero integration?

Xero is another UK accounting platform. The Xero integration works similarly to FreeAgent — connect via OAuth and create invoices from appointment data.

**To connect:** Go to Integrations → Xero → Connect. Same OAuth flow as FreeAgent.

You do not need both FreeAgent and Xero — connect whichever one you use.

---

## What is the Google Calendar integration?

Google Calendar sync (when active) provides two-way synchronisation:
- Appointments created in Qerxel appear in your Google Calendar
- Events in your Google Calendar block out time in the Qerxel booking page

This integration is configured but not yet active. When live, connect via Integrations → Google Calendar → Connect.

---

## What is the Google Business Profile integration?

Google Business Profile integration allows Qerxel to surface your Q score and booking link on your Google listing. This is planned functionality — not yet active.

---

## What is the review request feature?

After a completed appointment, you can trigger a review request to the client. This sends them a message (WhatsApp or email) asking them to leave a review on Google or another platform of your choice.

To use this: Go to the Calendar, find a completed appointment, and click the review request option. The message is sent immediately.

You can also configure automatic review requests to fire after all completed appointments, via the notification settings.

---

## What is the booking confirmation email?

When a customer books through your online booking page, they automatically receive a confirmation email with:
- What they booked and when
- Your business name and contact details
- A manage-booking link they can use to cancel or reschedule

This fires automatically. You do not need to configure it. The email comes from Qerxel's email system (via Resend) — it is not sent from your own email address.

---

## What is the welcome email?

When you complete onboarding, Qerxel sends you a welcome email confirming your account is active and your Qerxel number (once assigned). This is automated and cannot be resent manually.

---

## What is the difference between SMS and WhatsApp for after-call messages?

**SMS:**
- Works on any mobile phone — no app required
- From a shared Qerxel number (not your number)
- Limited to 160 characters per message segment
- Cheaper per message than WhatsApp in most cases

**WhatsApp:**
- Requires the recipient to have WhatsApp installed
- From your own WhatsApp Business number — personal and professional
- No hard character limit
- Richer message format
- The preferred choice for most sole trader businesses where the relationship is personal

For most businesses, WhatsApp produces better engagement because callers receive it from the business's own number. SMS is a good fallback for callers who may not have WhatsApp.
