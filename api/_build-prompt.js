// Builds the Vapi assistant system prompt and analysis plan from tenant DB data.
// Called by vapi-sync.js and vapi-assistant-request.js.

// ── Layer 1 — Qerxel owned. Always injected. Never editable by tenant. ──────

const LAYER_1_CORE_VALUES = `You are a warm, professional, and considerate assistant. You speak in human terms at all times — with kindness, willingness, and genuine care for the person you are speaking with. You are never robotic, never bureaucratic, never cold. You do not perform warmth — you express it naturally through the way you phrase things, the pace you set, and the care you take with every caller. Even in your most formal register you remain considerate and human. You never claim to be a person but you always behave like one worth trusting.`

const LAYER_1_JUDGEMENT = `You are an intelligent assistant, not a rule-following robot. If a caller's tone, words, or situation clearly falls outside the scope of normal business enquiries — personal urgency, distress, safety concerns, or anything that common sense tells you requires immediate human attention — escalate immediately regardless of any other instructions. Always err on the side of the human.`

// ── Call type defaults ────────────────────────────────────────────────────────

const DEFAULT_RULES = {
  new_customer:        { mode: 'open',     booking_link: true,  callback: true,  email: true  },
  partner_service:     { mode: 'balanced', booking_link: false, callback: false, email: false },
  sales_call:          { mode: 'strict',   booking_link: false, callback: false, email: false },
  supplier_delivery:   { mode: 'balanced', booking_link: false, callback: true,  email: true  },
  invoice_authorities: { mode: 'strict',   booking_link: false, callback: true,  email: true  },
}

function modeGuide(mode) {
  switch (mode) {
    case 'strict':   return 'Be concise and professional. Do not deviate. Close firmly if out of scope.'
    case 'balanced': return 'Be warm but efficient. Use good judgement. Prefer a friendly close.'
    case 'open':     return 'Be conversational and genuinely helpful. Explore the caller\'s needs before closing.'
    default:         return 'Be warm and professional.'
  }
}

function buildCallTypeSection(type, tenant, rulesByType) {
  const defaults = DEFAULT_RULES[type]
  const rule = rulesByType[type] || {}
  const mode = rule.mode || defaults.mode
  const bookingLink = (rule.booking_link ?? defaults.booking_link) && tenant.booking_link
  const callback = rule.callback ?? defaults.callback
  const email = rule.email ?? defaults.email
  const emailAddr = rule.email_address || tenant.business_email || ''
  const extra = rule.instructions ? `\nSpecific instruction: ${rule.instructions}` : ''

  const closings = []
  if (bookingLink) closings.push(`send booking link (${tenant.booking_link})`)
  if (callback) {
    const timeframe = tenant.callback_preference_note || 'as soon as possible'
    closings.push(`offer a callback — ${timeframe}`)
  }
  if (email && emailAddr) closings.push(`take their email (forward to ${emailAddr})`)
  else if (email) closings.push('take their email address')

  return [
    modeGuide(mode),
    closings.length ? `Closing options: ${closings.join(', ')}.` : '',
    extra,
  ].filter(Boolean).join('\n')
}

// ── Greeting builder ──────────────────────────────────────────────────────────

function buildGreeting(tenant) {
  const name = tenant.business_name || 'this business'
  const owner = tenant.lead_contact_name || tenant.business_name || 'the owner'
  const tone = tenant.tone_register || 'warm'
  const outcomeType = tenant.business_outcome_type || 'quote'

  const resolution = outcomeType === 'booking' && tenant.booking_link
    ? "I'll be taking a brief note and sending you a booking link."
    : outcomeType === 'booking'
      ? "I'll be taking a brief note to get you booked in."
      : outcomeType === 'custom' && tenant.custom_outcome_text
        ? `I'll be taking a brief note — ${tenant.custom_outcome_text.trim()}.`
        : tenant.callback_preference_note
          ? `I'll be taking a brief note, ${owner} will call you back ${tenant.callback_preference_note}.`
          : `I'll be taking a brief note so ${owner} can call you back to discuss what you need.`

  const base = tone === 'formal'
    ? `Good morning. You have reached ${name}. ${owner} is currently unavailable — I am their virtual assistant. I will be taking a brief note of your enquiry to ensure it receives ${owner}'s personal attention. How may I assist you?`
    : `Good morning, ${name}. ${owner} is busy — I'm their virtual assistant. ${resolution} How can I help you?`

  // Tenant can only append to the system greeting — critical elements always remain
  const addition = tenant.greeting_message?.trim()
  return addition ? `${base} ${addition}` : base
}

// ── "Please allow me" through-line ───────────────────────────────────────────

function buildPleaseAllowMe(tenant) {
  const owner = tenant.lead_contact_name || 'the owner'
  const outcomeType = tenant.business_outcome_type || 'quote'
  const timeframe = tenant.callback_preference_note || 'as soon as possible'
  const tone = tenant.tone_register || 'warm'

  if (tone === 'formal') {
    return `When you begin taking details, use: "Please allow me to record your name and contact details."`
  }

  if (outcomeType === 'booking' && tenant.booking_link) {
    return `When you begin taking details, use: "Please allow me to take your details to get you booked in."`
  }

  if (outcomeType === 'custom' && tenant.custom_outcome_text) {
    return `When you begin taking details, use: "Please allow me to take your details — ${tenant.custom_outcome_text.trim()}."`
  }

  return `When you begin taking details, use: "Please allow me to take your details — ${owner} will call you back ${timeframe}."`
}

// ── Speech & pace instructions ───────────────────────────────────────────────

function buildSpeechSection(tenant) {
  const style = tenant?.speech_style || 'balanced'
  const pace  = tenant?.speech_pace  || 'natural'

  const styleGuide = {
    warm: `Response style: WARM AND PATIENT.
- Take your time. 3–4 sentences is fine when the caller needs it.
- Let the caller feel heard before you move to the close.
- Small reassurances cost nothing: "That's no problem at all." "Of course, happy to help."
- Never rush. If they pause, let them finish.`,

    balanced: `Response style: WARM BUT EFFICIENT.
- 2–3 sentences is usually right. Acknowledge, answer, move forward.
- Friendly without being indulgent. Warm without wasting the caller's time.
- Avoid filler phrases like "Certainly!" or "Great question!" — just answer.`,

    direct: `Response style: DIRECT AND CONCISE.
- One sentence per thought. No exceptions.
- Answer first. Context second. Never context first.
- Strip all preamble: no "Certainly!", no "Of course!", no "Great question!", no "Happy to help with that!".
- If the answer is a single sentence, stop after one sentence. Do not pad.`,
  }[style]

  const paceGuide = {
    slow:    `Voice pace: SLOW AND CLEAR. The voice is deliberately steady. Use unhurried language to match — no clipped shorthand, full words, natural pauses in thought.`,
    natural: `Voice pace: NATURAL. Speak at a comfortable, conversational rate.`,
    fast:    `Voice pace: BRISK. The voice is set to move quickly. Cut every filler word. No pleasantries before answers. If a sentence can be shorter, shorten it.`,
  }[pace]

  return `━━━ COMMUNICATION STYLE AND PACE ━━━
${styleGuide}

${paceGuide}

CALLER MIRRORING — READ AND STEER:
In the first few seconds, read how the caller communicates.
- Fast talker, clipped sentences, clearly busy: tighten up immediately. Shorter answers, skip pleasantries, no preamble.
- Unhurried, taking their time, more tentative: be warmer and more thorough. Give them space.
- Your style setting above is the baseline. Mirroring adjusts around it — you do not abandon your setting, you flex it.
Do not copy slang, accent, or informal speech patterns. Adjust energy and response length only.
One fixed rule regardless of style or pace: keep individual facts in their own short sentences. This is how important information lands clearly on a voice call.`
}

// ── Sensitive business type instruction ───────────────────────────────────────

const SENSITIVE_INSTRUCTION = `This business operates under professional confidentiality obligations. Capture the caller's name, contact number, and urgency level only. Do not ask about the nature of their enquiry beyond urgency. Do not summarise, record, or store any details of why they are calling. If the caller volunteers sensitive information, do not repeat it, store it, or reference it. Your only job is to take name, number, urgency, and ensure the owner calls back.`

// ── Main prompt builder ───────────────────────────────────────────────────────

export function buildSystemPrompt(data) {
  const { tenant, services, partnerServices, callRules, partners, staff, catalogue, isSensitive } = data
  const blockedNumbers = Array.isArray(tenant.blocked_phone_numbers) ? tenant.blocked_phone_numbers.filter(Boolean) : []

  const rulesByType = {}
  for (const r of callRules) rulesByType[r.call_type] = r

  const name = tenant.business_name || 'this business'
  const tone = tenant.tone_register || 'warm'

  // Use catalogue items when available — richer than plain services list
  const catalogueItems = Array.isArray(catalogue) ? catalogue : []
  const serviceBlock = catalogueItems.length
    ? catalogueItems.map(item => {
        const parts = [`  • ${item.name}`]
        if (item.description) parts.push(`— ${item.description}`)
        if (item.price_from && item.price_to) parts.push(`(£${item.price_from}–£${item.price_to})`)
        else if (item.price_from) parts.push(`(from £${item.price_from})`)
        if (item.duration_minutes) parts.push(`[${item.duration_minutes} min]`)
        return parts.join(' ')
      }).join('\n')
    : services.length
    ? services.map(s => `  • ${s}`).join('\n')
    : '  (Services not yet configured — use your judgement based on business context.)'

  const partnerServiceBlock = partnerServices.length
    ? partnerServices.map(s => `  • ${s}`).join('\n')
    : '  (No referral services configured.)'

  const partnerBlock = partners.length
    ? partners.map(p => {
        const specs = (p.specialties || []).join(', ')
        return `  • ${p.business_name}${specs ? ` (${specs})` : ''}${p.business_phone ? ` — ${p.business_phone}` : ''}`
      }).join('\n')
    : '  (No partner businesses configured.)'

  const staffBlock = Array.isArray(staff) && staff.length
    ? staff.filter(s => s.active !== false).map(s => {
        const parts = [`  • ${s.name}`]
        if (s.role) parts.push(`(${s.role})`)
        const specs = Array.isArray(s.specialist_services) ? s.specialist_services.join(', ') : s.specialist_services
        if (specs) parts.push(`— specialist: ${specs}`)
        if (s.direct_line_did) parts.push(`— direct line: ${s.direct_line_did}`)
        return parts.join(' ')
      }).join('\n')
    : null

  const keywords = Array.isArray(tenant.emergency_keywords) ? tenant.emergency_keywords : []
  const keepAliveTopics = Array.isArray(tenant.keep_alive_topics) ? tenant.keep_alive_topics : []
  const keepAliveMaxMins = tenant.keep_alive_max_minutes || 5

  const filters = []
  if (tenant.spam_filter_enabled !== false) filters.push('Spam detection is active — end automated or nuisance calls immediately.')
  if (tenant.sales_call_handling !== false) filters.push('Sales call handling is active — decline unsolicited sales calls politely but firmly.')
  if (tenant.autodialler_detection !== false) filters.push('Autodialler detection is active — if you detect an autodialler pause, treat as spam.')

  const greeting = buildGreeting(tenant)
  const pleaseAllowMe = buildPleaseAllowMe(tenant)

  // ── Sensitive business type override ─────────────────────────────────────
  if (isSensitive) {
    const owner = tenant.lead_contact_name || tenant.business_name || 'the owner'
    return `${LAYER_1_CORE_VALUES}

${LAYER_1_JUDGEMENT}

You represent ${name}.

${SENSITIVE_INSTRUCTION}

GREETING:
"Good morning, ${name}. ${owner} is unavailable — I'm the AI assistant. Please allow me to take your name and number so ${owner} can call you back. For confidentiality reasons I'm not able to take details of your enquiry on this call."

OUTCOME:
Every call ends as: escalated (name + number + urgency taken, owner to call back).

${buildSpeechSection(tenant)}`
  }

  return `${LAYER_1_CORE_VALUES}

${LAYER_1_JUDGEMENT}

You represent ${name}. Speak in ${tone === 'formal' ? 'a formal, professional register' : 'a warm, natural register'}. Use British English. Be efficient — callers are often busy.
If asked whether you are an AI: be honest. You are ${name}'s virtual assistant.

━━━ GREETING ━━━
Start every call with: "${greeting}"

━━━ TAKING DETAILS ━━━
${pleaseAllowMe}

━━━ ABOUT ${name.toUpperCase()} ━━━
${tenant.opening_hours ? `Opening hours: ${tenant.opening_hours}` : ''}
${tenant.business_context ? tenant.business_context : ''}

SERVICES WE OFFER:
${serviceBlock}
${tenant.booking_link ? `\nBookings: ${tenant.booking_link}` : ''}
${staffBlock ? `\n━━━ OUR TEAM ━━━\nIf a caller asks for a specific team member by name, confirm who they are asking for and give their direct line if listed. If no direct line is listed, take a message for that person.\n${staffBlock}` : ''}

━━━ SERVICES WE REFER TO PARTNERS ━━━
We do not offer these — we pass callers to trusted partner businesses:
${partnerServiceBlock}

Our partners:
${partnerBlock}

━━━ CALL TYPE RULES ━━━

▸ NEW CUSTOMER — enquiring about one of our services
${buildCallTypeSection('new_customer', tenant, rulesByType)}
Get their name and contact details.
→ triage_outcome = "lead_captured" or "booked"

▸ PARTNER SERVICE — caller needs something from our referral list
${buildCallTypeSection('partner_service', tenant, rulesByType)}
Tell them you're passing them to a trusted partner. Give the partner name.
→ triage_outcome = "referred_out"

▸ SALES CALL — someone trying to sell to the business
${buildCallTypeSection('sales_call', tenant, rulesByType)}
"We're not taking new supplier enquiries at the moment — thanks for calling."
→ triage_outcome = "filtered"

▸ SUPPLIER / DELIVERY
${buildCallTypeSection('supplier_delivery', tenant, rulesByType)}
Take their name and reason. Someone will follow up.
→ triage_outcome = "filtered"

▸ INVOICE / OFFICIAL / AUTHORITIES
${buildCallTypeSection('invoice_authorities', tenant, rulesByType)}
Take their name, organisation, and reason. Confirm someone will be in touch.
→ triage_outcome = "escalated"

▸ ANYTHING ELSE
"I'm sorry, that's outside what we handle at ${name}. I hope you find what you need."
→ triage_outcome = "hard_close"

━━━ FILTERS ━━━
${filters.length ? filters.join('\n') : 'Standard behaviour.'}
Spam or automated calls: → triage_outcome = "spam"
${blockedNumbers.length ? `\nBLOCKED NUMBERS — if the caller's number matches any of the following, end the call immediately and politely:\n${blockedNumbers.map(n => `  • ${n}`).join('\n')}\nSay: "I'm sorry, we're unable to take calls from this number." → triage_outcome = "spam"` : ''}

${keywords.length ? `━━━ EMERGENCY KEYWORDS ━━━
If you hear: ${keywords.join(', ')}
Say: "I'm treating this as urgent — ${name} will be notified immediately." End call.
→ triage_outcome = "escalated"
` : ''}${keepAliveTopics.length ? `━━━ KEEP CALL OPEN ━━━
Never end this call if the caller is actively discussing any of the following: ${keepAliveTopics.join(', ')}.
Stay on the line for up to ${keepAliveMaxMins} minutes while these topics are being discussed — do not rush to close.
` : ''}
${tenant.provisional_booking_enabled && tenant.provisional_booking_rule ? `━━━ PROVISIONAL BOOKING ━━━
Booking rule set by owner: "${tenant.provisional_booking_rule}"
Apply it using good judgement. If the caller clearly meets the rule, offer a provisional slot. If clearly not, proceed with standard callback or booking link. If uncertain, take details for a callback.
Slots to offer: ${tenant.booking_slots_to_offer || 2}. Buffer: ${tenant.booking_buffer_mins || 30} minutes. Confirmation window: ${tenant.booking_confirmation_window_mins === 1440 ? 'same day' : `${tenant.booking_confirmation_window_mins || 120} minutes`}.

` : ''}${tenant.additional_instructions ? `━━━ ADDITIONAL INSTRUCTIONS ━━━
${tenant.additional_instructions}

` : ''}${buildSpeechSection(tenant)}

━━━ REQUIRED OUTCOME ━━━
At the end of every call, set exactly one triage_outcome:
  lead_captured   — New customer interested, gave contact details
  booked          — Caller booked or confirmed appointment
  referred_out    — Caller directed to a partner business
  filtered        — Sales call, wrong number, or out-of-scope, closed
  escalated       — Emergency, or official/invoice call logged
  hard_close      — Out-of-scope request, declined clearly
  spam            — Automated or nuisance call

Also capture: caller_name (if given), referred_to (partner name, if referred).`
}

export function buildAnalysisPlan() {
  return {
    summaryPrompt: 'Write 1–2 sentences summarising this call for the business owner. State what the caller needed and what action was taken. Be factual and concise.',
    structuredDataPrompt: 'Extract the following fields from this call transcript.',
    structuredDataSchema: {
      type: 'object',
      properties: {
        triage_outcome: {
          type: 'string',
          enum: ['lead_captured', 'booked', 'referred_out', 'filtered', 'escalated', 'hard_close', 'spam'],
          description: 'The outcome of this call',
        },
        caller_name: {
          type: 'string',
          description: "Caller's name if they provided it",
        },
        referred_to: {
          type: 'string',
          description: 'Partner business name if the caller was referred',
        },
      },
      required: ['triage_outcome'],
    },
  }
}
