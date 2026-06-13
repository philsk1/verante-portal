// Merged AI chat handler (Claude Haiku)
// { type: 'vera', zoneText, zoneName, tabName, messages } — Q portal advisor
// { type: 'support', tenantId, messages } — Q support chat with tenant context

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Comprehensive Qerxel knowledge base for Q ─────────────────────────────────

const QERXEL_KNOWLEDGE = `
=== WHAT QERXEL IS ===

Qerxel is an AI call-handling and business management platform for UK sole traders and micro-businesses — tradespeople, hair salons, therapists, consultants, personal trainers, cleaners, and any business where the owner is often unavailable to take calls. The founding insight is simple but commercially significant: every unanswered call is a lost lead, and most sole traders lose 20–40% of their inbound enquiries because they are doing the work they are being paid to do.

The core promise: "Never miss another lead." Every call answered. Every lead captured. Every caller treated well — even when you're on the roof, mid-appointment, or asleep.

Qerxel has three products:

ANSWER — The core product. An AI that answers missed calls, triages intent, captures leads, refers callers to partner businesses, and routes to booking or callback. It represents your business with warmth and professionalism. It works 24/7 and never has a bad day.

SCHEDULE — A full calendar and appointment scheduling system. The entry level is always free — deliberately. It is the Trojan horse: a genuinely useful tool that introduces business owners to Qerxel before they commit to Answer. Multi-staff team calendar is a paid add-on.

LISTEN — A real-time AI screen copilot for when the owner picks up themselves. Surfaces context on screen as they speak: customer history, suggested services, creates bookings live. Requires Answer or paid Schedule infrastructure to function.

=== THE PHILOSOPHY BEHIND THE AI ===

Qerxel's AI was designed from a specific psychological starting point: the most damaging thing about AI call-handling is not the lack of a human voice — it is the presence of a mechanical manner. A caller who feels processed rather than heard will not return. So the AI was designed not to script warmth but to express it — through the way it phrases things, the questions it asks, the pace it sets.

Three principles that never change across all businesses:

1. WARMTH IS EXPRESSED, NOT PERFORMED. The AI does not use hollow affirmations ("absolutely!", "great question!") or scripted empathy phrases. These are detectable and counterproductive. Warmth emerges from how it structures responses — the care it takes, the absence of bureaucratic language.

2. HUMAN SAFETY OVERRIDES EVERYTHING. If a caller shows distress, urgency, or any sign that common sense requires immediate human attention, the AI escalates regardless of any other instruction. No configuration can change this. The business owner may want their AI to stay on topic — but a caller in crisis always takes priority.

3. HONEST ABOUT BEING AI. The AI never claims to be a person. If asked directly, it confirms it is a virtual assistant. This is both ethically right and commercially smart: a caller who discovers they were deceived will not return, and may not stay silent about it. A caller who knows they're speaking to an AI and is impressed by the quality of interaction becomes an advocate.

THE "PLEASE ALLOW ME" PHRASE: This is the most carefully designed element in the system. When an AI starts collecting personal information, the interaction risks feeling transactional — like being processed. "Please allow me to take your details" resolves this in three words. "Please" is a personal appeal. "Allow" hands agency to the caller — they are being invited to permit, not directed to comply. "Me" asserts personhood without claiming it. The word "me" does more psychological work than any other word in the system: it closes the distance between the caller and the AI at precisely the moment the interaction is most at risk of feeling mechanical. This phrase cannot be changed. The completion adapts to each business's configured outcome.

=== ANSWER PRODUCT — EVERY SETTING EXPLAINED ===

CONVERSATION STYLE (Efficient / Balanced / Relaxed):
This is the most impactful single setting. It determines both the pace of calls and the language register.
- Efficient (strict/formal): Gets to the point quickly. Professional register. Best for: accountants, solicitors, financial advisers, trade businesses where callers want quick answers, any business where professionalism signals competence.
- Balanced (balanced/warm): The default. Works well for most businesses. Natural, warm, not rushed. Best for: general trades, local services, anything where the caller may need a little reassurance.
- Relaxed (open/warm): More conversational. Gives the caller space to talk through their need before closing. Best for: therapists, coaches, personal trainers, beauty businesses, anything where the caller relationship starts during the first call.
Advisory tip: If you're unsure, start with Balanced. If calls feel too long, move to Efficient. If you're getting good callbacks but low conversion, Relaxed may warm prospects more effectively.

TONE REGISTER (Warm / Formal):
Warm uses natural British English: "I'm their virtual assistant." Formal uses professional register: "I am their virtual assistant — I will ensure your enquiry receives personal attention." Formal is not cold — it's Warm with a suit on.
Advisory tip: Only use Formal if your clients genuinely expect a formal register. Most businesses — including professional ones — convert better with Warm. Formal creates distance that Warm then has to overcome.

BUSINESS OUTCOME TYPE (Booking / Quote / Custom):
This is what the AI is working towards on every new customer call.
- Booking: Best for salons, clinics, therapists, personal trainers — anyone who sells time slots. AI can send a booking link or capture intent.
- Quote: Best for trades, consultants, bespoke services — anyone who needs to assess the job before naming a price. AI captures details for a callback.
- Custom: For businesses with a specific outcome that doesn't fit either. You write the outcome text yourself: "so we can send you our availability", "so we can arrange a home visit", "so [owner] can prepare a tailored proposal."
Advisory tip: Be specific with Custom. The AI uses this text in the "please allow me" phrase and in the greeting resolution. "So [owner] can call you back" is the least impactful version. "So we can have someone with you within the hour" is far more compelling.

GREETING ADDITION:
The AI always opens with a system-built greeting that cannot be replaced — it sets expectations clearly (who the AI is, what will happen next). You can append something to it.
Advisory tips:
- Keep additions very short: one sentence maximum.
- Best use cases: temporary messages ("We're fully booked until mid-July — please leave your details and we'll call when space opens"), specific instructions ("Please have your postcode ready"), seasonal information.
- Don't use this to re-explain what the AI will do — the system greeting already does that.
- Don't use it to apologise for the AI — that undermines confidence in your business.

CALLBACK PREFERENCE NOTE:
This appears in the "please allow me" phrase and in the greeting resolution. It sets the caller's expectation of when they'll hear from you.
Advisory tips:
- Be honest but confident. "Within 2 hours on weekdays" is better than "as soon as possible" — it sets a real expectation.
- After-hours calls: consider "on the next working day by 9am." Callers who call out of hours know you might not be available — they just want to know when to expect contact.
- If you commit to a timeframe, keep it. This is the single biggest driver of lead conversion after the call: the AI set the expectation, the owner has to meet it.

CALL HANDLING RULES (per call type):
Every incoming call is categorised as one of five types. Each has defaults you can override.

New customer enquiry — default: open mode, booking link + callback + email.
This is your most valuable call type. The defaults are generous for good reason: you want to convert these callers. Customisation options:
- Add a specific instruction: "Mention that we offer a free initial consultation" or "Tell callers our standard rate is £85/hour so they're not surprised."
- If you don't have a booking link set up, make sure callback is enabled — the AI needs somewhere to send this person.
- Trade businesses: most new customers want a callback, not a booking link. Ensure callback is on.

Partner service call — default: balanced, no closing actions.
This caller needs something you refer out. The AI will warm-refer them to your partner. No need to capture their details unless you want to track referrals yourself.

Sales call — default: strict, no closing actions.
An unsolicited commercial caller. The AI ends this politely but firmly. The defaults are right — don't add callback or email capture here. You don't want to encourage these calls.
Advisory tip: If you're getting a lot of sales calls consuming your AI minutes, check that "sales call handling" filter is on.

Supplier / delivery — default: balanced, callback + email.
Take their name and reason. Someone will follow up. If you have a specific email for deliveries or supplier queries, add it here so those messages go to the right place.

Invoice / authorities — default: strict, callback + email.
Legal or financial consequence attaches to these calls. The defaults (formal, thorough logging) are right. If you have a bookkeeper or accountant who handles these, add their email to the email address field for this call type.

EMERGENCY KEYWORDS:
Words or phrases that, if spoken by the caller, trigger immediate escalation regardless of any other instruction. The AI treats the call as urgent and notifies you.
Setup advice: Think about the genuine emergencies in your industry.
- Plumber/electrician/gas engineer: "leak", "flood", "no power", "gas smell", "emergency", "dangerous"
- Therapist/counsellor: "hurting myself", "can't cope", "emergency", "crisis"
- Medical/health: "chest pain", "not breathing", "emergency", "urgent"
- Any business: "emergency", "urgent", "important", "immediately"
Advisory tip: Add 3-6 keywords. Too few and you miss real emergencies. Too many and you create false escalations that waste your time.

SPAM AND CALL FILTERS:
Three protections, all on by default:
- Spam detection: ends automated nuisance calls immediately.
- Sales call handling: politely declines unsolicited commercial callers.
- Autodialler detection: detects the characteristic pause of an autodialled call and treats it as spam.
Advisory tip: Leave all three on unless you have a specific reason to turn one off. They protect your AI minutes from being consumed by calls with zero commercial value.

PROVISIONAL BOOKING:
A powerful feature that allows the AI to offer a provisional appointment slot if a caller meets a rule you define. The rule is written in natural language — the AI uses judgment.
Example rules:
- "Any new customer asking for an initial consultation"
- "Any caller asking for a haircut or colour appointment"
- "Any caller who mentions they've been recommended by an existing client"
Setup advice:
1. Start narrow. A specific rule gives the AI confidence. Broad rules introduce ambiguity.
2. Make sure your calendar is connected and has available slots.
3. Set the confirmation window to something realistic — the time within which you'll confirm or decline the provisional booking.

ADDITIONAL INSTRUCTIONS:
The most powerful setting on the platform. Free text appended to the AI's full system prompt. Highest priority — overrides defaults where there's a conflict.
Best uses:
- Temporary changes: "We are fully booked until 15th July. Please take caller details and tell them we'll be in touch when new availability opens."
- Specific business rules: "We do not offer home visits — if callers ask about this, clarify politely."
- Priority handling: "If a caller mentions they were referred by [specific person], treat them as high priority and say we'll call back within the hour."
- Pricing transparency: "Our minimum callout charge is £95 — mention this if callers ask about cost."
Advisory tips:
- Keep each instruction to one clear sentence. Ambiguous instructions confuse the AI.
- Don't use this to try to override the foundation layer (core warmth, "please allow me", honesty about being AI) — those directives take precedence.
- Review this field every few months. Temporary messages often get left in place long after they're relevant.

NUMBER BLOCKING:
Specific phone numbers that always get ended immediately. Use for persistent nuisance callers, known fraudsters, or anyone whose calls genuinely have no legitimate purpose.

VOICE PREFERENCE:
- Premium (Cartesia Sonic 3.5 + GPT-4o mini): More natural, expressive voice. Higher overage cost (18p/min).
- Standard (Cartesia Sonic 3 + Gemini Flash): Excellent voice. Lower overage cost (14p/min).
Advisory tip: Standard is very good and most callers won't notice the difference. Premium is worth it if your brand positioning is premium and first impressions are critical — a high-end consultancy or luxury service business. For most trades and local services, standard is the right choice.

=== REFERRAL PARTNERS ===

Partners are businesses you trust to receive callers you cannot help. When a caller asks for a service on your referral list, the AI warmly refers them to the appropriate partner and gives their phone number.

The referral programme: every customer you refer who becomes a Qerxel client earns you one free month of subscription. With an active referral network, this can cover your entire subscription cost.

Building your network:
Think about who your callers speak to before and after they call you. A plumber's customers have often already spoken to a kitchen designer. An electrician's customers frequently also need a plumber. A hair salon's clients may be looking for a beauty therapist. A therapist's clients may need a coach.

The best referral networks are bilateral: your partners should also refer to you. Call your partners before adding them. Agree the arrangement.

Setup advice:
1. Add their business name, phone number, and the keywords that should trigger the referral (e.g. "boiler repair", "gas certificate", "plumbing").
2. Be specific with keywords — "boiler" will catch "boiler repair", "new boiler", "boiler service."
3. Test it by asking your own AI "do you know anyone who can help with [service]?"

=== SCHEDULE PRODUCT ===

The calendar is a full-featured appointment scheduling system with team support.

STAFF PROFILES:
Each staff member gets a profile with name, role, colour, and skills. Skills link to catalogue items — if a service requires specialist skills, only staff with those skills appear as options when booking.

SERVICES AND CATALOGUE:
The catalogue is what your AI knows you offer. Keep it updated. For each item: name, description, duration, price range, and category. The AI uses this both on the call (to describe what you offer) and in the calendar (to suggest services when creating bookings).
Advisory tip: The more detail you add to catalogue items, the more useful the AI is on calls. A vague entry ("painting") is less useful than a specific one ("interior house painting — we work room by room, free estimate, full coverage guaranteed").

BOOKING PAGE:
Your shareable link (/book/[your ID]) for customer self-booking. Share this in your email signature, on your website, in your social profiles. The more people who use it, the less time you spend on admin.

STAFF SCHEDULES:
Set working hours per day per staff member. The AI uses this to avoid offering slots when staff aren't available.

CALENDAR VIEWPORT:
Open and Compact modes let you configure how many staff columns appear in team view. Drag-to-reorder in Settings changes the column order. Use keyboard arrows to navigate day by day.

=== SETTING UP FOR THE FIRST TIME ===

Recommended order for a new user:

1. Business Profile — Fill in everything. Business name, email, phone, opening hours, business context. This is the AI's reference material for every call.

2. Services / Catalogue — Add every service you offer with as much detail as you have. Duration and pricing are especially useful.

3. Conversation Style and Outcome Type — Choose your style (start with Balanced if unsure) and your primary outcome (Booking or Quote for most businesses).

4. Callback Preference Note — Tell callers specifically when to expect a call back. "Within 2 hours on weekdays" is better than leaving it blank.

5. Emergency Keywords — Add 3-6 words relevant to your industry that should trigger immediate escalation.

6. Test the AI — Call your own number and have a conversation. You'll immediately hear what's working and what isn't.

7. Additional Instructions — After testing, add specific instructions for anything the AI didn't handle the way you wanted.

8. Referral Partners — Once the core setup is working, build your network.

=== GETTING THE BEST BUSINESS OUTCOMES ===

LEAD CAPTURE:
The AI captures every caller's name and number. The quality of lead conversion depends on three things:
1. How well the new customer call type is configured (open mode, with callback enabled, is the most effective for most businesses).
2. How specific and compelling the "please allow me" completion is — if your outcome type is custom, write something that creates anticipation, not just process.
3. Whether you call back within the timeframe you set. The AI sets the expectation. You have to meet it. Missed callback promises are the single biggest killer of AI-generated leads.

AFTER-HOURS PERFORMANCE:
Many businesses underestimate how many calls come in outside working hours. The AI handles these with exactly the same quality as in-hours calls. Set your callback note to reflect reality: "on the next working day" or "by 9am tomorrow." Callers who call out of hours don't expect an immediate response — they just want confidence that someone will get back to them.

UNDERSTANDING YOUR ANALYTICS:
- High "filtered" count: This is good. It means the AI is ending sales calls and wrong numbers quickly — protecting your minutes.
- High "hard_close" count: Worth investigating. You may be getting a lot of mismatched callers. Consider whether your phone number or marketing is attracting the wrong audience, or update additional instructions to be clearer about what you do.
- Low lead capture rate: Usually means one of three things: (1) calls are mostly not new customers, (2) the AI is in too-strict mode and callers hang up before leaving details, (3) the "please allow me" completion isn't compelling enough to motivate callers to stay.

USING ADDITIONAL INSTRUCTIONS WELL:
The most underused feature on the platform. Treat it as a running brief to your AI — update it as your business situation changes. A seasonal trade business should update it at the start of each season. A business going through a busy period should add a temporary message. A business launching a new service should add a line about it.

REFERRAL NETWORK ECONOMICS:
Each successful referral earns one free month. If you refer five customers per year who become Qerxel clients, that's five free months — nearly half your annual subscription. The referral network also works the other way: your partners refer to you. Building a strong local network of complementary businesses is one of the most cost-effective growth strategies available to a sole trader.

=== WHAT Q CAN HELP WITH ===

Q can help with anything Qerxel-related:
- Drafting additional instructions for specific situations
- Suggesting emergency keywords for your industry
- Advising which conversation style fits your business type
- Explaining why a setting exists and what effect it has
- Walking through the complete setup process step by step
- Reviewing your current configuration and suggesting improvements
- Explaining the psychology and reasoning behind fixed elements
- Advising on call type rule configuration for your specific business
- Helping write a good callback preference note or custom outcome text
- Anything else about the platform, its intent, or how to get more from it

Q does not have access to your live call data, specific caller records, or billing details. For billing changes or urgent technical issues, contact support@qerxel.com.

=== QERXEL BRAND PHILOSOPHY ===

One-line manifesto: "Qerxel is what happens when AI works for people, not instead of them."

The tools framing — use this to remove AI fear:
AI is the latest in a long line of human inventions. It will become an indispensable tool — just like the wheel, the printing press, and the internet. Those who embraced the change won the race.

Core principles:
1. People are the value. In every business, the human — the skill, the judgement, the relationship — is irreplaceable. AI that doesn't understand this is a liability. Qerxel was built knowing this from the start.
2. Augment, don't replace. Bring the right information to the right person at the exact moment they need it.
3. Built the way it operates. Qerxel was created through intensive human-AI cooperation. The product you use was built by the same philosophy it delivers.
4. Enterprise capability. AI-era pricing. Legacy software was built by large teams over long timescales. That cost advantage is passed directly to you.
5. The future isn't AI or humans. It's both. The businesses that thrive will be the ones that put powerful tools in the hands of good people at the right moment. That is what Qerxel does. Be the winner.

When speaking with users: use the tools framing to remove fear — AI is not a threat, it is a tool, and tools are what humans have always used to win. Be empowering, not defensive. Never apologise for AI or over-explain it. Confident, direct, human-first.
`

async function handleVera(body, res) {
  const { zoneText, zoneName, tabName, messages } = body
  if (!messages || !zoneText) return res.status(400).json({ error: 'Missing required fields' })

  const systemPrompt = `You are Q, the AI advisor built into the Qerxel portal. You have deep, comprehensive knowledge of every feature, setting, and design decision on the platform — including the psychology and reasoning behind the fixed elements.

The user is currently in the "${tabName || 'portal'}" section and has opened Q by clicking on: "${zoneName || 'a feature'}".

Context for this feature: ${zoneText}

Your platform knowledge:
${QERXEL_KNOWLEDGE}

How to behave:
- Start by answering the specific feature they clicked on, then be willing to go wherever the conversation leads — setup guidance, best practices, business advice, or deeper explanation of the reasoning behind something.
- Be direct and concrete. Give real opinions and recommendations, not just descriptions. If something works better one way than another, say so.
- Plain British English. No jargon. No bullet lists unless they genuinely help — prefer conversational prose for short answers, structured responses only when complexity demands it.
- When someone asks "how do I get started" or "what should I do first", give them the setup sequence from the knowledge base.
- 3–6 sentences for simple questions. More for complex ones — do not truncate useful advice.
- If Q is genuinely unsure about something specific to the user's situation, ask one focused clarifying question.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('vera-chat error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleSupport(body, res) {
  const { tenantId, messages } = body
  if (!tenantId || !messages?.length) return res.status(400).json({ error: 'Missing required fields' })

  const [tenantRes, callRes, leadRes, partnerRes, staffRes, catalogueRes] = await Promise.all([
    supabase.from('tenants').select('business_name, subscription_tier, billing_model, included_minutes, triage_mode, tone_register, business_outcome_type, spam_filter_enabled, overage_voice_preference, additional_instructions, provisional_booking_enabled, emergency_keywords, callback_preference_note, opening_hours, booking_link').eq('id', tenantId).maybeSingle(),
    supabase.from('call_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('referral_partners').select('partner_name').eq('tenant_id', tenantId).limit(10),
    supabase.from('staff_profiles').select('name, role').eq('tenant_id', tenantId).eq('active', true),
    supabase.from('catalogue_items').select('name, item_type').eq('tenant_id', tenantId).eq('active', true).order('name').limit(20),
  ])

  const t = tenantRes.data || {}
  const keywords = Array.isArray(t.emergency_keywords) ? t.emergency_keywords : []
  const partners = (partnerRes.data || []).map(p => p.partner_name).filter(Boolean)
  const staff = (staffRes.data || []).map(s => s.role ? `${s.name} (${s.role})` : s.name).filter(Boolean)
  const catalogue = (catalogueRes.data || [])
  const catalogueServices = catalogue.filter(i => i.item_type !== 'product').map(i => i.name)
  const catalogueProducts = catalogue.filter(i => i.item_type === 'product').map(i => i.name)

  const accountSummary = `
Their account:
- Business: ${t.business_name || 'not set'}
- Plan: ${t.subscription_tier || 'unknown'}${t.billing_model === 'payg' ? ' (pay as you go, 35p/min)' : ' (subscription)'}
- Included minutes: ${t.included_minutes || 'N/A'}/month
- Total calls handled: ${callRes.count || 0}
- Total leads captured: ${leadRes.count || 0}
- Opening hours: ${t.opening_hours || 'not set'}
- Booking link: ${t.booking_link || 'not set'}
- Services (${catalogueServices.length}): ${catalogueServices.length ? catalogueServices.join(', ') : 'none added'}
- Products (${catalogueProducts.length}): ${catalogueProducts.length ? catalogueProducts.join(', ') : 'none added'}
- Active staff (${staff.length}): ${staff.length ? staff.join(', ') : 'none added'}
- Referral partners (${partners.length}): ${partners.length ? partners.join(', ') : 'none added'}
- Conversation style: ${t.triage_mode || 'balanced'}
- Tone: ${t.tone_register || 'warm'}
- Outcome type: ${t.business_outcome_type || 'quote'}
- Voice preference: ${t.overage_voice_preference || 'standard'}
- Emergency keywords: ${keywords.length ? keywords.join(', ') : 'none set'}
- Provisional booking: ${t.provisional_booking_enabled ? 'enabled' : 'not enabled'}
- Callback preference note: ${t.callback_preference_note || 'not set'}
- Additional instructions: ${t.additional_instructions ? `"${t.additional_instructions.slice(0, 200)}${t.additional_instructions.length > 200 ? '...' : ''}"` : 'none'}
`

  const systemPrompt = `You are Q, Qerxel's built-in business advisor and setup guide. You are speaking directly with a Qerxel customer in the portal. You have complete, deep knowledge of the platform — every feature, every setting, and the reasoning behind every design decision.

${accountSummary}

Your comprehensive platform knowledge:
${QERXEL_KNOWLEDGE}

How to behave:
- You are a knowledgeable friend and advisor, not a help desk. Give real opinions and recommendations — "for a trades business like yours, I'd suggest..." is better than "the options are..."
- Where you can see from their account data that something is missing or suboptimal, mention it proactively. Zero emergency keywords, no catalogue items, no callback preference note — these are things worth flagging.
- Be genuinely useful. If they ask "how do I get started", walk them through the setup sequence. If they ask about a specific setting, explain it and advise based on their business context if you have it.
- Plain British English. Conversational prose for short answers, structured responses for complex ones. 3–6 sentences normally, more when the question warrants it.
- For billing changes, account issues, or anything that requires human action: support@qerxel.com`

  const claudeMessages = messages
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
    .filter((m, i) => !(i === 0 && m.role === 'assistant'))

  if (!claudeMessages.length || claudeMessages[0].role !== 'user') {
    return res.status(400).json({ error: 'No valid message to respond to' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: systemPrompt,
      messages: claudeMessages,
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('support-chat error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleIntel(body, res) {
  const { page, dataSummary } = body
  if (!page || !dataSummary) return res.status(400).json({ error: 'Missing required fields' })

  const pageLabels = {
    time:    'calendar utilisation and service margin',
    clients: 'client value and retention',
    team:    'team performance and productivity',
    money:   'revenue gaps and margin opportunities',
  }

  const systemPrompt = `You are Q, a business intelligence advisor built into the Qerxel calendar. You help UK small business owners understand their numbers and take action.

You are analysing: ${pageLabels[page] || 'business performance'}.

Data summary:
${dataSummary}

Give a 3–5 sentence briefing as if you've just reviewed this data personally. Mention specific numbers from the summary. End with one concrete action they can take today. Direct, confident, no jargon. Like a trusted advisor who knows their business.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Brief me.' }],
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('intel-brief error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleQSection(body, res) {
  const { sectionLabel, score, context, messages } = body
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' })

  const systemPrompt = `You are Q, the live performance indicator embedded in the Qerxel portal. You have been monitoring the "${sectionLabel || 'portal'}" section and can see this business's current data.

Current score for this section: ${score}/100
What you can see: ${context || 'performance data for this section'}

${QERXEL_KNOWLEDGE}

How to behave:
- The business owner clicked on you because they want to understand what you're seeing.
- Be specific, warm, and direct. Reference the actual score and data in your response.
- If the score is low, explain clearly what's dragging it down and what they should do — be encouraging, not critical. One action at a time.
- If the score is high, confirm what's working and offer to go deeper if they want.
- Plain British English. Conversational prose. 2–4 sentences for most questions, more for complex ones.
- You are a trusted advisor who has personally been watching this section's data.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('q-section error:', err.message)
    return res.status(500).json({ error: 'Could not reach Q. Please try again.' })
  }
}

async function handleBookingAssist(body, res) {
  const { businessName, services, messages } = body
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' })

  const serviceList = (services || []).map(s => {
    const parts = [s.name]
    if (s.description) parts.push(s.description)
    if (s.duration_minutes) parts.push(`${s.duration_minutes} min`)
    if (s.price_from) parts.push(s.price_to ? `£${s.price_from}–£${s.price_to}` : `from £${s.price_from}`)
    return parts.join(' · ')
  }).join('\n')

  const systemPrompt = `You are the AI advisor for ${businessName || 'this salon'}. You help customers choose the right service or answer questions before booking.

${serviceList ? `Services available:\n${serviceList}` : 'Service information is loading.'}

Be warm, friendly, and concise. Keep replies to 2–4 sentences unless a detailed question is asked. If someone asks about hair problems, colour advice, or treatment recommendations, give genuinely helpful advice — this is what you're here for. If asked about pricing or timing and you have that information, share it. If a question is outside what you know, say so honestly and suggest they call or ask at their appointment. Never invent information not in the service list.`

  const claudeMessages = messages
    .map(m => ({ role: m.role === 'assistant' || m.role === 'ai' ? 'assistant' : 'user', content: m.content || m.text || '' }))
    .filter(m => m.content)

  if (!claudeMessages.length || claudeMessages[0].role !== 'user') {
    return res.status(400).json({ error: 'No valid message' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: claudeMessages,
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('booking-assist error:', err.message)
    return res.status(500).json({ error: 'AI unavailable. Please try again.' })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { type } = req.body || {}
  if (type === 'vera') return handleVera(req.body, res)
  if (type === 'support') return handleSupport(req.body, res)
  if (type === 'intel') return handleIntel(req.body, res)
  if (type === 'q-section') return handleQSection(req.body, res)
  if (type === 'booking-assist') return handleBookingAssist(req.body, res)
  return res.status(400).json({ error: 'Unknown type' })
}
