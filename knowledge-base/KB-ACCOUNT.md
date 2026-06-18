# Account Settings and Billing

## What can I change in Account Settings?

Account Settings is where you manage the business-level settings that affect your whole portal:

- **Account details** — your login email, password changes
- **Business branding** — logo, brand colour for your booking page
- **Data retention** — how long call logs are kept
- **Billing and plan** — your subscription tier, usage, invoices
- **GDPR export** — download all your data
- **Notifications** — which alerts you receive and how

---

## What is my subscription tier and what does it include?

Your subscription tier determines which features are available and how many call minutes are included per month.

**Answer tiers:**

| Tier | Price | Minutes/month | What's different |
|------|-------|--------------|-----------------|
| Free | Pay-as-you-go | None | Charged per minute at usage rates |
| Light | £29/month | ~100 | Ideal for sole traders with moderate call volume |
| Standard | £49/month | ~200 | Growing businesses, more calls and features |
| Professional | £69/month | ~350 | Removes Qerxel discovery card from booking page, more capacity |
| Enterprise | £249/month | Custom | Multi-location, custom integrations |
| Bespoke | Custom | Custom | White-label and enterprise configuration |

**Schedule-only** — You have the booking calendar but not AI call handling.

---

## What happens when I use all my included minutes?

When your call minutes reach 80% of your monthly allowance, you receive an email warning.

When you reach 100%, you receive an exhausted notification. Q continues answering calls — it does not stop. Additional call minutes are charged at your tier's overage rate.

You can see your current minute usage on the dashboard or in Account Settings.

---

## What is the voice preference setting?

Voice preference controls which voice technology Q uses:
- **Standard** — Qerxel's standard voice (Cartesia standard)
- **Premium** — Qerxel's premium voice (Cartesia premium, slightly different characteristics)

This setting also affects your overage rate — premium voice incurs a slightly higher per-minute charge over your included allowance.

---

## What is a Pay-As-You-Go account?

On the free tier, there are no included minutes. Every call minute is charged at a per-minute rate. The monthly cost limit setting prevents unexpected bills — when your spend reaches the limit, a warning is sent (currently a log entry; a hard stop is planned).

PAYG is best for businesses with very low call volume (under 30 calls per month) or businesses that want to trial Qerxel before committing to a monthly plan.

---

## What branding options are on my booking page?

Your public booking page (the page customers use to book online) can be branded to match your business:

**Brand colour** — A hex code (#RRGGBB) that sets the accent colour on the booking page. Applied to the header gradient, active step dots, and selected items.

**Logo URL** — A web address pointing to your logo image. Shown in the booking page header. Host your logo somewhere publicly accessible (your website, Dropbox public link, Cloudinary, etc.) and paste the URL here.

**Promotional banner** — Up to 160 characters of text shown as an amber banner above the booking form. Good for seasonal offers, urgent notices, or special conditions. You can also set an expiry date — the banner hides itself after this date automatically.

**Branding requires:** An active Answer product OR the multi-staff Schedule tier. Free Schedule-only accounts use Qerxel's default branding.

---

## Can I remove the Qerxel branding from my booking page?

The "Powered by Qerxel" discovery card on the booking confirmation page can be removed on Professional tier and above. This is configurable in Account Settings → Hide Qerxel discovery card.

The footer line "Booking service provided free by Qerxel business software" is **never removable** on any tier. This is the commercial condition that allows Qerxel to offer the booking calendar for free.

---

## What notifications does Qerxel send?

You can configure which notifications you receive:

**New lead alert** — An email when a call ends with lead_captured or booked outcome. Tells you the caller's name, number, and Q's summary. On by default.

**Daily summary** — An email each morning with the previous day's call count, outcome breakdown, and any leads to follow up. Off by default.

**Weekly report** — An email on Monday mornings with the previous week's performance. On by default.

**Urgent escalation** — An immediate SMS and/or email when Q assigns an escalated outcome. Always on — cannot be turned off (you need to know about urgent calls immediately).

**Minute usage warnings** — Emails at 80% and 100% of your monthly allowance. Always on.

All notifications go to your `business_email` (set in Business Profile). SMS escalation alerts go to your `business_phone`.

---

## What is data retention?

Qerxel stores your call logs, transcripts, and summaries for a set number of days. The default is 90 days.

After the retention period, old calls are automatically deleted. This:
- Keeps your storage footprint manageable
- Reduces GDPR data retention risk (you are not holding caller data longer than necessary)

If you need longer retention for compliance or business reasons (insurance claims, legal proceedings), increase the setting in Account Settings before old calls fall outside the window.

**Sensitive businesses (legal, medical, financial):** Transcripts and summaries are never stored, regardless of your retention setting. Only duration and outcome are kept.

---

## How do I export my data?

Go to Account Settings → Export Data → Download CSV.

The export includes:
- All call logs (date, duration, outcome, summary)
- All caller records (phone, name)
- All appointment records

Transcripts are included in the export where they have been stored (not for sensitive businesses, not for calls outside the retention window).

Use this to satisfy GDPR data subject access requests from callers.

---

## How do I change my email or password?

Account details are managed through Supabase Auth. To change your email or password:
- Go to Account Settings → Account
- Enter your new email or password and confirm

A verification email is sent when you change your email address. Your account is not transferred until you click the verification link.

---

## How do I cancel my account?

Contact support (support@qerxel.com or via Q in your portal). Data is retained for 30 days after cancellation in case you change your mind or need to export anything. After 30 days, all data is deleted permanently.

If you want to keep your call data before cancelling, export it first using the GDPR export.
