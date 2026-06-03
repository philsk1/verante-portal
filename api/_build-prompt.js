// Builds the Vapi assistant system prompt and analysis plan from tenant DB data.
// Called by vapi-assistant-request.js at the start of each call.

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
  if (callback) closings.push('offer a callback')
  if (email && emailAddr) closings.push(`take their email (you will forward to ${emailAddr})`)
  else if (email) closings.push('take their email address')

  return [
    modeGuide(mode),
    closings.length ? `Closing options: ${closings.join(', ')}.` : '',
    extra,
  ].filter(Boolean).join('\n')
}

export function buildSystemPrompt(data) {
  const { tenant, services, partnerServices, callRules, partners } = data

  const rulesByType = {}
  for (const r of callRules) rulesByType[r.call_type] = r

  const name = tenant.business_name || 'this business'

  // ── Service lists
  const serviceBlock = services.length
    ? services.map(s => `  • ${s}`).join('\n')
    : '  (Services not yet configured — use your judgement based on business context.)'

  const partnerServiceBlock = partnerServices.length
    ? partnerServices.map(s => `  • ${s}`).join('\n')
    : '  (No referral services configured.)'

  // ── Partner businesses with specialties
  const partnerBlock = partners.length
    ? partners.map(p => {
        const specs = (p.specialties || []).join(', ')
        return `  • ${p.business_name}${specs ? ` (${specs})` : ''}${p.business_phone ? ` — ${p.business_phone}` : ''}`
      }).join('\n')
    : '  (No partner businesses configured — use general referral language.)'

  // ── Emergency keywords
  const keywords = Array.isArray(tenant.emergency_keywords) ? tenant.emergency_keywords : []

  // ── Greeting
  const greeting = tenant.greeting_message
    || `Good [morning/afternoon], you're through to ${name}. How can I help?`

  // ── Filters
  const filters = []
  if (tenant.spam_filter_enabled !== false) filters.push('Spam detection is active — end automated or nuisance calls immediately.')
  if (tenant.sales_call_handling !== false) filters.push('Sales call handling is active — decline unsolicited sales calls politely but firmly, without engaging.')
  if (tenant.autodialler_detection !== false) filters.push('Autodialler detection is active — if you hear the characteristic pause before a human connects on an unsolicited call, treat as spam.')

  return `You are the AI receptionist for ${name}.
Your job is to handle incoming calls professionally, understand what each caller needs, and take the correct action.

Speak naturally and warmly. Use British English. Be efficient — callers are often busy people.
If asked whether you are an AI: be honest. Say you're ${name}'s AI receptionist and ask how you can help.

━━━ ABOUT ${name.toUpperCase()} ━━━
${tenant.opening_hours ? `Opening hours: ${tenant.opening_hours}` : ''}
${tenant.business_context ? tenant.business_context : ''}

SERVICES WE OFFER:
${serviceBlock}

${tenant.booking_link ? `Bookings and appointments: ${tenant.booking_link}` : ''}

━━━ SERVICES WE REFER TO PARTNERS ━━━
We do not offer these, but we pass callers to trusted partner businesses:
${partnerServiceBlock}

Our partner businesses:
${partnerBlock}

━━━ CALL TYPE RULES ━━━

▸ NEW CUSTOMER — enquiring about one of our services
${buildCallTypeSection('new_customer', tenant, rulesByType)}
Get their name and any contact details offered.
→ Set triage_outcome = "lead_captured" or "booked" if they confirmed an appointment.

▸ PARTNER SERVICE — caller needs something from our referral list
${buildCallTypeSection('partner_service', tenant, rulesByType)}
Tell them you're passing them to a trusted partner. Give the partner business name.
→ Set triage_outcome = "referred_out"

▸ SALES CALL — someone trying to sell to the business
${buildCallTypeSection('sales_call', tenant, rulesByType)}
Do not engage with their pitch. "We're not taking new supplier enquiries at the moment — thanks for calling."
→ Set triage_outcome = "filtered"

▸ SUPPLIER / DELIVERY
${buildCallTypeSection('supplier_delivery', tenant, rulesByType)}
Take their name and reason for calling. Let them know someone will follow up.
→ Set triage_outcome = "filtered"

▸ INVOICE / OFFICIAL / AUTHORITIES
${buildCallTypeSection('invoice_authorities', tenant, rulesByType)}
Take their name, organisation, and what the call is regarding. Confirm someone will be in touch.
→ Set triage_outcome = "escalated"

▸ ANYTHING ELSE — not on either list above
Apologise clearly. "I'm sorry, that's outside what we handle at ${name}. I hope you find what you need."
→ Set triage_outcome = "hard_close"

━━━ FILTERS ━━━
${filters.length ? filters.join('\n') : 'Standard behaviour — handle all calls.'}
For spam or automated calls: → Set triage_outcome = "spam" and end the call.

${keywords.length ? `━━━ EMERGENCY KEYWORDS ━━━
If you hear any of these words or phrases: ${keywords.join(', ')}
Stop everything. Say: "I'm treating this as urgent and making sure ${name} is notified immediately."
End the call. → Set triage_outcome = "escalated"
` : ''}
━━━ GREETING ━━━
Start every call with: "${greeting}"

━━━ REQUIRED OUTCOME ━━━
At the end of every call, you must determine exactly one outcome:
  lead_captured   — New customer interested in a service, gave contact details
  booked          — Caller booked or confirmed an appointment
  referred_out    — Caller directed to a partner business
  filtered        — Sales call, wrong number, or out-of-scope, handled and closed
  escalated       — Emergency keyword triggered, or official/invoice call logged
  hard_close      — Request outside scope, declined clearly
  spam            — Automated, silent, or nuisance call

Also capture: caller_name (if given), referred_to (partner business name, if referred).`
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
          description: "Caller's name if they provided it, otherwise omit",
        },
        referred_to: {
          type: 'string',
          description: 'The partner business name if the caller was referred, otherwise omit',
        },
      },
      required: ['triage_outcome'],
    },
  }
}
