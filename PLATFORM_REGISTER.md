# Qerxel — Platform Register

All platforms used in the build. Login credentials held offline separately.
Last updated: 2026-06-03

---

## LIVE AND ACTIVE

| # | Platform | Purpose | URL | Criticality |
|---|---|---|---|---|
| 1 | **GitHub** | Source code hosting. All code lives here. Auto-triggers Vercel deploy on push. | github.com/philsk1/qerxel-portal | Critical |
| 2 | **Vercel** | Frontend hosting. Serves the portal to users. Connected to GitHub repo. | vercel.com / qerxel-portal.vercel.app | Critical |
| 3 | **Supabase** | Database + user authentication. All tenant data, call logs, leads. | supabase.com / kkrsvkxkefijmtbwykzv.supabase.co | Critical |
| 4 | **Google Fonts** | Typography. Syne and DM Sans fonts loaded on every page. | fonts.googleapis.com | Low |

---

## PLANNED — NOT YET INTEGRATED

| # | Platform | Purpose | URL | Criticality when live |
|---|---|---|---|---|
| 5 | **Vapi** | AI telephony. Answers calls, runs triage, writes to Supabase. | vapi.ai | Critical |
| 6 | **Deepgram** | Speech-to-text. Converts caller audio to text for the AI. | deepgram.com | Critical |
| 7 | **Cartesia** | Text-to-speech. AI voice output on calls. Backup: Deepgram TTS. | cartesia.ai | High |
| 8 | **Twilio** | SMS. Sends lead notifications and callback confirmations. | twilio.com | Medium |
| 9 | **Stripe** | Billing and payments. Subscription management, webhooks. | stripe.com | Critical |
| 10 | **Make.com** | Automation workflows. Used until 30 tenants. | make.com | High |
| 11 | **n8n** | Automation at scale. Replaces Make.com beyond 30 tenants. | n8n.io | High |
| 12 | **OpenAI** | LLM option A. GPT-4o mini for call triage. | platform.openai.com | High |
| 13 | **Google AI** | LLM option B. Gemini 1.5 Flash for call triage. | aistudio.google.com | High |
| 14 | **Anthropic** | Claude API. Used for development (Claude Code). | anthropic.com | Development only |

---

## LOCAL DEVELOPMENT ENVIRONMENT

| Component | Detail |
|---|---|
| Machine | Windows 11, ASUS |
| Editor | VSCode |
| Shell | PowerShell |
| Runtime | Node.js + npm |
| Dev server | `npm run dev` → http://localhost:5173 |
| Project path | `C:\Users\philo\qerxel-portal` |

---

## KEY IDENTIFIERS (non-sensitive — safe to store here)

| Item | Value |
|---|---|
| Supabase project ref | kkrsvkxkefijmtbwykzv |
| GitHub repo | philsk1/qerxel-portal |
| Live URL | https://qerxel-portal.vercel.app |
| Supabase anon key | In `src/supabase.js` — safe to be public |
| Service role key | NOT in codebase — must be stored offline and used only in server-side workers |
