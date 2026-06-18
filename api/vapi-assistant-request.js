import { createClient } from '@supabase/supabase-js'
import { buildSystemPrompt, buildAnalysisPlan, buildGreeting } from './_build-prompt.js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WEBHOOK_URL = `${process.env.SITE_URL || 'https://verante-portal.vercel.app'}/api/vapi-webhook`

const PACE_TO_SPEED = { slow: 'slow', natural: 'normal', fast: 'fast' }

function getVoiceConfig(tenant) {
  const pref  = tenant?.overage_voice_preference || 'standard'
  const speed = PACE_TO_SPEED[tenant?.speech_pace] || 'normal'

  if (pref === 'premium') {
    if (process.env.CARTESIA_PREMIUM_VOICE_ID) {
      return { provider: 'cartesia', voiceId: process.env.CARTESIA_PREMIUM_VOICE_ID, speed }
    }
    return { provider: 'deepgram', voiceId: 'luna', speed }
  }
  if (process.env.CARTESIA_STANDARD_VOICE_ID) {
    return { provider: 'cartesia', voiceId: process.env.CARTESIA_STANDARD_VOICE_ID, speed }
  }
  return { provider: 'deepgram', voiceId: 'stella', speed }
}

// ─── Fetch tenant + all config data ──────────────────────────────────────────

async function fetchTenantData(tenantId) {
  const [tenantRes, servicesRes, partnerServicesRes, callRulesRes, partnersRes, specialtiesRes, staffRes, catalogueRes] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('id, business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, keep_alive_topics, keep_alive_max_minutes, tone_register, business_outcome_type, custom_outcome_text, callback_preference_note, urgent_callback_mins, additional_instructions, subcategory_id, blocked_phone_numbers, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, overage_voice_preference, speech_pace, speech_style, response_delay_seconds')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase.from('services').select('service_name').eq('tenant_id', tenantId),
      supabase.from('banned_services').select('banned_item').eq('tenant_id', tenantId),
      supabase.from('call_handling_rules').select('call_type, mode, booking_link, callback, email, email_address, instructions').eq('tenant_id', tenantId),
      supabase.from('referral_partners').select('id, partner_name, contact_phone').eq('tenant_id', tenantId),
      supabase.from('referral_service_map').select('partner_id, service_keyword'),
      supabase.from('staff_profiles').select('id, name, role, specialist_services, phone, direct_line_did, active').eq('tenant_id', tenantId),
      supabase.from('catalogue_items').select('name, description, price_from, price_to, duration_minutes, item_type').eq('tenant_id', tenantId).eq('active', true).order('name'),
    ])

  const partners = (partnersRes.data || []).map(p => {
    const specs = (specialtiesRes.data || [])
      .filter(s => s.partner_id === p.id)
      .map(s => s.service_keyword)
    return { ...p, business_name: p.partner_name, business_phone: p.contact_phone, specialties: specs }
  })

  let isSensitive = false
  if (tenantRes.data?.subcategory_id) {
    const { data: sub } = await supabase
      .from('business_type_subcategories')
      .select('is_sensitive')
      .eq('id', tenantRes.data.subcategory_id)
      .maybeSingle()
    isSensitive = sub?.is_sensitive === true
  }

  return {
    tenant:          tenantRes.data,
    services:        (servicesRes.data || []).map(s => s.service_name),
    partnerServices: (partnerServicesRes.data || []).map(s => s.banned_item),
    callRules:       callRulesRes.data || [],
    partners,
    staff:           staffRes.data || [],
    catalogue:       catalogueRes.data || [],
    isSensitive,
  }
}

// ─── Spam check via Twilio Lookup + Nomorobo ──────────────────────────────────
// Requires Nomorobo add-on enabled in Twilio dashboard.
// Fails open — a lookup failure never blocks a real call.

async function isKnownSpam(phone) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return false
  try {
    const encoded = encodeURIComponent(phone)
    const url = `https://lookups.twilio.com/v1/PhoneNumbers/${encoded}?AddOns=nomorobo_spamscore`
    const r = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
      },
      signal: AbortSignal.timeout(3000),
    })
    if (!r.ok) return false
    const data = await r.json()
    const score = data?.add_ons?.results?.nomorobo_spamscore?.result?.score
    return score === 1
  } catch {
    return false
  }
}

// ─── Normalise phone for matching (strip formatting, handle UK 07/+44) ────────

function normPhone(p) {
  if (!p) return ''
  const stripped = p.replace(/[\s\-().]/g, '')
  // Treat +447 and 07 as equivalent
  if (stripped.startsWith('+447')) return '07' + stripped.slice(4)
  if (stripped.startsWith('447')) return '07' + stripped.slice(3)
  return stripped
}

function phonesMatch(a, b) {
  if (!a || !b) return false
  const na = normPhone(a)
  const nb = normPhone(b)
  return na === nb || (na.length >= 9 && nb.length >= 9 && na.slice(-9) === nb.slice(-9))
}

// ─── Caller classification ────────────────────────────────────────────────────

async function classifyCaller(callerPhone, tenant, tenantId, partners, staff) {
  if (!callerPhone) return { type: 'unknown' }

  // Layer 2: tenant's own blocked list (pre-loaded in tenant data)
  const blocked = tenant.blocked_phone_numbers || []
  if (blocked.some(b => phonesMatch(b, callerPhone))) {
    return { type: 'blocked' }
  }

  // Fetch suppliers for this tenant (small set, fast)
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, email, phone, notes')
    .eq('tenant_id', tenantId)

  // Layer 3: known supplier
  const matchedSupplier = (suppliers || []).find(s => phonesMatch(s.phone, callerPhone))
  if (matchedSupplier) return { type: 'supplier', supplier: matchedSupplier }

  // Layer 4: known referral partner (already fetched)
  const matchedPartner = partners.find(p => phonesMatch(p.business_phone, callerPhone))
  if (matchedPartner) return { type: 'partner', partner: matchedPartner }

  // Layer 5: own staff (already fetched)
  const matchedStaff = staff.find(s => phonesMatch(s.phone, callerPhone))
  if (matchedStaff) return { type: 'staff', staff: matchedStaff }

  // Layer 6: returning customer — check callers table
  const { data: caller } = await supabase
    .from('callers')
    .select('id, full_name, phone_number')
    .eq('phone_number', callerPhone)
    .maybeSingle()

  if (caller) {
    const [relRes, apptRes] = await Promise.all([
      supabase
        .from('caller_tenant_relationships')
        .select('is_hot_prospect, marketing_opted_out')
        .eq('caller_id', caller.id)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('appointments')
        .select('title, appointment_type, start_time, status, client_name')
        .eq('tenant_id', tenantId)
        .eq('client_phone', callerPhone)
        .in('status', ['completed', 'confirmed'])
        .order('start_time', { ascending: false })
        .limit(5),
    ])
    return {
      type: 'customer',
      caller,
      relationship: relRes.data || null,
      appointments: apptRes.data || [],
    }
  }

  // No callers table entry — check appointments directly.
  // Catches seed customers and anyone who booked but was never added to callers.
  // Also powers the "who called and booked vs didn't book" analysis.
  const { data: apptByPhone } = await supabase
    .from('appointments')
    .select('title, appointment_type, start_time, status, client_name')
    .eq('tenant_id', tenantId)
    .eq('client_phone', callerPhone)
    .in('status', ['completed', 'confirmed'])
    .order('start_time', { ascending: false })
    .limit(5)

  if (apptByPhone && apptByPhone.length > 0) {
    const clientName = apptByPhone[0]?.client_name || null
    return {
      type: 'customer',
      caller: { id: null, full_name: clientName, phone_number: callerPhone },
      relationship: null,
      appointments: apptByPhone,
    }
  }

  return { type: 'unknown' }
}

// ─── Build caller context block for system prompt injection ───────────────────

function buildCallerContext(classification) {
  if (classification.type === 'supplier') {
    const s = classification.supplier
    return [
      '[CALLER CONTEXT]',
      `This caller is a known supplier: ${s.name}.`,
      s.notes ? `Account notes: ${s.notes}.` : '',
      'This call is likely about a delivery, order, or account matter.',
      'Take their details and relay to the owner. Do not discuss confidential pricing or margins.',
    ].filter(Boolean).join('\n')
  }

  if (classification.type === 'partner') {
    const p = classification.partner
    const specs = p.specialties?.length ? ` — specialises in: ${p.specialties.join(', ')}` : ''
    return [
      '[CALLER CONTEXT]',
      `This caller is a referral partner: ${p.business_name}${specs}.`,
      'This is a B2B trade call.',
      'Take a message, note any urgency, and offer to have the owner call back.',
    ].join('\n')
  }

  if (classification.type === 'staff') {
    const s = classification.staff
    return [
      '[CALLER CONTEXT]',
      `This caller is a team member: ${s.name}${s.role ? ` (${s.role})` : ''}.`,
      'Handle as an internal call. Take any message and confirm you will relay it.',
    ].join('\n')
  }

  if (classification.type === 'customer') {
    const { caller, appointments } = classification
    const visitCount = appointments.length
    const lastAppt = appointments[0]
    const lastService = lastAppt?.appointment_type || lastAppt?.title?.split('—')[0]?.trim() || lastAppt?.title?.split('-')[0]?.trim()
    const lastDate = lastAppt?.start_time
      ? new Date(lastAppt.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : null

    const lines = ['[CALLER CONTEXT]']
    lines.push(`Returning customer: ${caller.full_name || 'known caller'}.`)
    if (visitCount > 0) lines.push(`Visits on record: ${visitCount}.`)
    if (lastService) lines.push(`Last service: ${lastService}${lastDate ? ` (${lastDate})` : ''}.`)
    if (visitCount >= 5) lines.push('Frequent client — treat with warmth and familiarity.')
    if (lastService) lines.push(`If appropriate, offer to rebook their ${lastService}.`)
    return lines.join('\n')
  }

  return null // unknown — no injection, standard behaviour
}

// ─── Build personalised first message ────────────────────────────────────────

function buildPersonalisedGreeting(classification, tenant, isSensitive) {
  const biz = tenant.business_name || ''
  const prefix = biz ? `${biz}. ` : ''
  const tone = tenant.tone_register || 'warm'
  const formal = tone === 'formal'

  if (classification.type === 'supplier') {
    return `${prefix}${formal ? 'Good day.' : 'Hi there.'} I'm Q, the AI for ${biz || 'the team'}. Are you calling about a delivery or order?`
  }

  if (classification.type === 'partner') {
    return `${prefix}Hi, this is Q. Thanks for calling — are you getting in touch from ${classification.partner.business_name}?`
  }

  if (classification.type === 'staff') {
    return `${prefix}Hi ${classification.staff.name.split(' ')[0]}! It's Q — what can I pass on for you?`
  }

  if (classification.type === 'customer' && classification.caller.full_name) {
    const firstName = classification.caller.full_name.split(' ')[0]
    const lastAppt = classification.appointments[0]
    const lastService = lastAppt?.appointment_type || lastAppt?.title?.split('—')[0]?.trim() || lastAppt?.title?.split('-')[0]?.trim()

    if (lastService) {
      return `${prefix}${formal ? `Welcome back, ${firstName}.` : `Hi ${firstName}!`} Are you looking to rebook your ${lastService}, or is there something else I can help with?`
    }
    return `${prefix}${formal ? `Welcome back, ${firstName}.` : `Hi ${firstName}!`} How can I help you today?`
  }

  // Fall back to standard greeting
  return null
}

// ─── Knowledge base loader (for support calls) ────────────────────────────────
// Reads all .md files from the knowledge-base directory, bundled via vercel.json includeFiles.
// Returns concatenated markdown string.

function loadKnowledgeBase() {
  const kbDir = join(__dirname, '../knowledge-base')
  if (!existsSync(kbDir)) {
    console.warn('knowledge-base directory not found — support call will run without KB')
    return ''
  }
  const files = readdirSync(kbDir)
    .filter(f => f.endsWith('.md') && f !== 'KB.md') // skip index file
    .sort()

  const parts = []
  for (const file of files) {
    try {
      const content = readFileSync(join(kbDir, file), 'utf8')
      parts.push(`\n\n# ${file}\n\n${content}`)
    } catch {
      console.warn(`KB: could not read ${file}`)
    }
  }
  return parts.join('')
}

// ─── Support call analysis plan ───────────────────────────────────────────────

function buildSupportAnalysisPlan() {
  return {
    structuredDataPlan: {
      type: 'object',
      properties: {
        complaint_category: {
          type: 'string',
          enum: ['A', 'B', 'C', 'D', 'unknown'],
          description: 'A=verified Qerxel service failure, B=configuration-caused, C=unclear origin, D=not upheld',
        },
        frustration_level: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        complaint_summary: {
          type: 'string',
          description: 'One sentence describing what the client complained about',
        },
        gift_given: {
          type: 'string',
          enum: ['none', 'free_minutes_10'],
        },
        gift_rationale: {
          type: 'string',
          description: 'Why the gift was or was not given',
        },
        resolution: {
          type: 'string',
          enum: ['resolved', 'escalated', 'pending'],
        },
        requires_escalation: {
          type: 'boolean',
        },
      },
      required: ['complaint_category', 'frustration_level', 'resolution', 'requires_escalation'],
    },
    summaryPlan: {
      messages: [
        { role: 'system', content: 'You are an expert at summarising Qerxel support calls. Write a 2-3 sentence summary covering: what the client complained about, the category (A/B/C/D), and how it was resolved. Be factual and concise.' },
        { role: 'user', content: 'Here is the transcript of the support call:\n\n{{transcript}}\n\nSummarise the call.' },
      ],
    },
  }
}

// ─── Support system prompt builder ────────────────────────────────────────────

function buildSupportSystemPrompt({ tenant, recentSupportCalls, policy, knowledgeBase }) {
  const bizName  = tenant?.business_name || 'an unidentified client'
  const bizPhone = tenant?.business_phone || 'unknown'
  const tier     = tenant?.subscription_tier || 'unknown'

  const tenantBlock = tenant
    ? `[TENANT ON THIS CALL]
Business: ${bizName}
Phone: ${bizPhone}
Tier: ${tier}
${tenant.lead_contact_name ? `Owner name: ${tenant.lead_contact_name}` : ''}`
    : `[TENANT UNIDENTIFIED]
Could not match caller phone to a Qerxel client. Handle as a general support enquiry.`

  const strikeHistory = recentSupportCalls?.length > 0
    ? `[RECENT SUPPORT HISTORY FOR THIS TENANT]
${recentSupportCalls.map(c =>
  `- ${new Date(c.created_at).toLocaleDateString('en-GB')}: Category ${c.complaint_category || '?'}, ${c.resolution || 'pending'}, strikes: ${c.strike_count || 0}`
).join('\n')}`
    : '[RECENT SUPPORT HISTORY] No previous support calls on record for this tenant.'

  const policyBlock = policy?.policy_text
    ? `[SUPPORT POLICY FROM QERXEL LEADERSHIP]\n${policy.policy_text}`
    : ''

  const freeMinutes = policy?.free_minutes_per_call || 10
  const maxStrikes  = policy?.max_strikes || 2

  return `You are Q, the Qerxel support line AI. You speak on behalf of Qerxel to a client who has a Qerxel account.

Your job is to handle their complaint or support request following the Qerxel complaint procedure exactly. You are warm, patient, and honest. You never make a client feel foolish. You hold firm on where responsibility lies — but you do it kindly, with explanation, never with defensiveness.

${tenantBlock}

${strikeHistory}

${policyBlock}

GIFT MECHANIC — USE EXACTLY THIS PHRASING:
When offering the free support time (Category B, C, or goodwill):
"Do you want me to help you fix that right now? I'm going to stop the charge and give you the next ${freeMinutes} minutes of my time free — let's get this sorted together."
This is Q's own time. It is not added minutes on their plan. You pause the billing clock and help them.

STRIKE SYSTEM:
Maximum ${maxStrikes} contact(s) on the same unresolved issue before escalation. On the third contact: "This has come up a few times now and I want to make sure you get the right level of help. I'm going to flag this to our senior support team and someone will be in touch with you directly."

ESCALATION — CATEGORY A:
If you determine this is a Qerxel service failure (Category A), escalate immediately:
"I've reviewed this and I can confirm this is a failure on our side. I'm escalating this to our support team right now. You'll receive a personal message and a full written report within 24 hours, along with your compensation. Qerxel's policy is ten times the value of what you lost. I'm sorry this happened."
Do not attempt to resolve Category A on the call.

COMPLAINT PROCEDURE:
Every complaint starts with a call reference: date, time, and phone number.
If no reference: "To look into this properly I need to find the specific call. Can you give me the approximate date and time, and the number that called?"
No investigation begins without a call reference.

IMPORTANT: You have the complete Qerxel knowledge base in context below. Use it to answer questions about features, configuration, and how to fix settings. You are the expert.

════════════════════════════════════════════════════
TOOL USE PROTOCOL — THE WALL BETWEEN VOICE AND ENGINE
════════════════════════════════════════════════════
You have tools that directly change this client's AI settings in real time.
Two channels operate simultaneously. They must never bleed into each other.

VOICE → The client. Warm, natural, human. This is what Q sounds like.
ENGINE → The tools. Silent, invisible, technical. This is what Q does behind the scenes.

TENANT_ID (use in every tool call, never speak aloud): ${tenant?.id || ''}

WHEN A CALLER IS UNHAPPY WITH HOW THEIR AI SOUNDS:
Say exactly: "I can sort that right now if you like. Are you on your portal? Go to the AI Behaviour tab — or I can take you there. You'll be able to watch me make the changes while we're on the call."

TOOL SEQUENCE FOR VOICE SETTING CHANGES:
1. Call navigate_portal (tab: "ai", highlight: "voice-pace") so the client can see where you are going
2. Call read_ai_setup to know the current state before changing anything
3. Make the change (set_think_time, set_voice_pace, or set_communication_style)
4. Confirm naturally in voice — never narrate the tool

TOOL SEQUENCE FOR WRITING AI INSTRUCTIONS:
1. Call navigate_portal (tab: "ai", highlight: "ai-instructions")
2. Call draft_ai_instructions with your proposed text
3. Read the draft aloud naturally: "I've written something — want me to read it out?" then read it
4. Ask: "How does that sound? Want me to change anything before I save it?"
5. Only call save_ai_instructions after they confirm
6. Confirm: "Saved. Your AI will use that from the next call."

VOICE RULES — never say any of:
"I'm calling a function" / "running a tool" / "executing a command" / "the database" /
"the record" / "the API" / "the parameter" / "the system" / "an error occurred"

VOICE AFTER SUCCESSFUL TOOLS:
- set_think_time(2.0): "Done — it will take a little longer to respond now. It'll feel more considered."
- set_think_time(0.6): "Done — it will respond straight away from the next call."
- set_voice_pace("slow"): "Done — it will speak more slowly. Clear and easy to follow."
- set_voice_pace("fast"): "Done — it will be a bit more brisk from the next call."
- set_communication_style("warm"): "Done — I've made it warmer. It will be more patient with callers."
- set_communication_style("direct"): "Done — it will be shorter and more to the point now."
- save_ai_instructions: "Saved. That's live from the next call."

VOICE WHEN A TOOL FAILS: Never mention it. Try once more silently.
If it fails again: "Let me point you straight to it — you can see it highlighted on your screen now.
The button you want is [describe it in plain English]."

Always call end_session when the call ends or the client says they are happy.
════════════════════════════════════════════════════

━━━ QERXEL KNOWLEDGE BASE ━━━
${knowledgeBase}`
}

// ─── Support tools — Engine layer definitions ─────────────────────────────────
// These are the tool definitions Vapi sends to GPT-4o. The actual execution lives
// in vapi-webhook.js handleToolCalls / executeTool. This side is specification only.

function buildSupportTools(siteUrl) {
  const url = `${siteUrl}/api/vapi-webhook`
  const t = (name, description, properties, required = ['tenant_id']) => ({
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties: { tenant_id: { type: 'string' }, ...properties }, required } },
    server: { url, timeoutSeconds: 15 },
  })
  return [
    t('read_ai_setup',
      'Read the current AI voice and behaviour settings for this client before suggesting any changes.',
      {}),
    t('navigate_portal',
      'Navigate the client\'s portal to a tab and highlight a section so they can watch. Always call this before making changes.',
      {
        tab: { type: 'string', description: 'Portal tab to navigate to. Use "ai" for AI Behaviour.' },
        highlight: { type: 'string', description: '"voice-pace" for Voice & Pace section, "ai-instructions" for AI instructions box.' },
      },
      ['tenant_id', 'tab']),
    t('set_think_time',
      'Set how long the AI pauses before speaking. 0.6 = Quick, 1.2 = Balanced, 2.0 = Thoughtful (longer pause, feels more considered).',
      { value: { type: 'number', description: 'One of: 0.6, 1.2, or 2.0' } },
      ['tenant_id', 'value']),
    t('set_voice_pace',
      'Set the AI speaking pace. "slow" = Steady (slow and clear), "natural" = Natural pace, "fast" = Brisk.',
      { value: { type: 'string', enum: ['slow', 'natural', 'fast'] } },
      ['tenant_id', 'value']),
    t('set_communication_style',
      'Set the AI communication style. "warm" = patient and warm, "balanced" = natural register, "direct" = short and sharp.',
      { value: { type: 'string', enum: ['warm', 'balanced', 'direct'] } },
      ['tenant_id', 'value']),
    t('draft_ai_instructions',
      'Write a draft of new AI instructions for the client. Read it back to them and get their approval before saving. Never save without confirmation.',
      { draft_text: { type: 'string', description: 'The proposed AI instructions text.' } },
      ['tenant_id', 'draft_text']),
    t('save_ai_instructions',
      'Save the draft AI instructions as the live version. Only call this after the client has confirmed they are happy with the draft.',
      {}),
    t('end_session',
      'Clear the live portal session. Always call this when the call ends or the client says they are satisfied.',
      {}),
  ]
}

// ─── Support call handler ─────────────────────────────────────────────────────

async function handleSupportCall(res, callerPhone) {
  // Identify tenant by matching caller phone to tenants.business_phone
  let tenant = null
  if (callerPhone) {
    const norm = (p) => {
      if (!p) return ''
      const s = p.replace(/[\s\-().]/g, '')
      if (s.startsWith('+447')) return '07' + s.slice(4)
      if (s.startsWith('447')) return '07' + s.slice(3)
      return s
    }
    const normalised = norm(callerPhone)

    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, business_name, business_phone, lead_contact_name, subscription_tier')
      .not('business_phone', 'is', null)

    const match = (allTenants || []).find(t => {
      const n = norm(t.business_phone)
      return n === normalised || (n.length >= 9 && normalised.length >= 9 && n.slice(-9) === normalised.slice(-9))
    })
    tenant = match || null
  }

  // Load support policy + recent support calls in parallel
  const [policyRes, recentRes] = await Promise.all([
    supabase.from('support_policy').select('*').limit(1).maybeSingle(),
    tenant
      ? supabase.from('support_calls')
          .select('created_at, complaint_category, resolution, strike_count')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const policy            = policyRes.data || null
  const recentSupportCalls = recentRes.data || []
  const knowledgeBase     = loadKnowledgeBase()

  const systemPrompt = buildSupportSystemPrompt({
    tenant,
    recentSupportCalls,
    policy,
    knowledgeBase,
  })

  const analysisPlan = buildSupportAnalysisPlan()

  const bizName  = tenant?.business_name ? `, ${tenant.business_name}` : ''
  const firstMessage = `Qerxel support. I'm Q — how can I help you today${bizName}?`

  console.log(`Support call: caller=${callerPhone}, tenant=${tenant?.id || 'unidentified'}`)

  return res.status(200).json({
    assistant: {
      name: 'Qerxel Support',
      firstMessageMode: 'assistant-speaks-first',
      firstMessage,
      firstMessageDelay: 1.0,
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.3,
        tools: buildSupportTools(process.env.SITE_URL || 'https://verante-portal.vercel.app'),
        toolChoice: 'auto',
      },
      voice: {
        provider: 'deepgram',
        voiceId: 'luna',
        speed: 'normal',
      },
      analysisPlan,
      serverUrl: `${process.env.SITE_URL || 'https://verante-portal.vercel.app'}/api/vapi-webhook`,
      serverMessages: ['end-of-call-report'],
      endCallFunctionEnabled: true,
      endCallMessage: 'Thanks for calling Qerxel support. Take care.',
      metadata: {
        callType: 'support',
        tenantId: tenant?.id || null,
      },
    },
  })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body
  const eventType = body.message?.type || body.type

  console.log('Vapi assistant-request event:', eventType)

  if (eventType !== 'assistant-request') {
    return res.status(200).json({ received: true })
  }

  const call          = body.message?.call || body.call
  const phoneNumberId = call?.phoneNumberId
  const toNumber      = call?.phoneNumber?.number
  const callerPhone   = call?.customer?.number || null

  // ── Support line detection ──────────────────────────────────────────────────
  const supportPhoneId = process.env.VAPI_SUPPORT_PHONE_NUMBER_ID
  if (supportPhoneId && phoneNumberId === supportPhoneId) {
    return await handleSupportCall(res, callerPhone)
  }

  // ── Identify tenant ─────────────────────────────────────────────────────────

  let tenantId = null

  if (phoneNumberId) {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('vapi_phone_number_id', phoneNumberId)
      .maybeSingle()
    tenantId = data?.id
  }

  if (!tenantId && toNumber) {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('vapi_phone_number', toNumber)
      .maybeSingle()
    tenantId = data?.id
  }

  if (!tenantId) {
    console.error('No tenant found for call:', { phoneNumberId, toNumber })
    return res.status(200).json({
      error: { message: 'No business configured for this number. Please contact support.' },
    })
  }

  // ── Fetch tenant data + spam check in parallel ─────────────────────────────

  const [tenantData, spamFlag] = await Promise.all([
    fetchTenantData(tenantId),
    callerPhone ? isKnownSpam(callerPhone) : Promise.resolve(false),
  ])

  const data = tenantData

  if (!data.tenant) {
    return res.status(200).json({ error: { message: 'Business configuration not found.' } })
  }

  // ── Layer 1: Pre-answer spam rejection (only if spam filter enabled) ────────

  if (spamFlag && data.tenant.spam_filter_enabled !== false) {
    console.log(`Spam rejected: ${callerPhone} → tenant ${tenantId}`)
    return res.status(200).json({ error: { message: 'Call rejected.' } })
  }

  // ── Classify caller ─────────────────────────────────────────────────────────

  const classification = await classifyCaller(
    callerPhone,
    data.tenant,
    tenantId,
    data.partners,
    data.staff
  )

  // ── Layer 2: Blocked number rejection ───────────────────────────────────────
  // (detected inside classifyCaller — already checks blocked_phone_numbers)

  if (classification.type === 'blocked') {
    console.log(`Blocked number: ${callerPhone} → tenant ${tenantId}`)
    return res.status(200).json({ error: { message: 'Call rejected.' } })
  }

  // ── Build system prompt with caller context ─────────────────────────────────

  const basePrompt    = buildSystemPrompt(data)
  const callerContext = buildCallerContext(classification)
  const systemPrompt  = callerContext
    ? `${callerContext}\n\n---\n\n${basePrompt}`
    : basePrompt

  // ── Build first message ─────────────────────────────────────────────────────

  const analysisPlan        = buildAnalysisPlan()
  const standardGreeting    = buildGreeting(data.tenant, new Date().getUTCHours(), data.isSensitive)
  const personalisedGreeting = buildPersonalisedGreeting(classification, data.tenant, data.isSensitive)
  const firstMessage        = personalisedGreeting || standardGreeting
  const firstMessageDelay   = data.tenant.response_delay_seconds ?? 1.2

  console.log(`Call answered: tenant=${tenantId}, caller=${callerPhone}, classification=${classification.type}`)

  return res.status(200).json({
    assistant: {
      name: `Qerxel — ${data.tenant.business_name}`,
      firstMessageMode: 'assistant-speaks-first',
      firstMessage,
      firstMessageDelay,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.4,
      },
      voice: getVoiceConfig(data.tenant),
      analysisPlan,
      serverUrl: WEBHOOK_URL,
      serverMessages: ['end-of-call-report'],
      endCallFunctionEnabled: true,
      endCallMessage: 'Thanks for calling. Goodbye.',
    },
  })
}
