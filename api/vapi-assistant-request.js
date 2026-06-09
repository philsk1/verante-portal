import { createClient } from '@supabase/supabase-js'
import { buildSystemPrompt, buildAnalysisPlan } from './_build-prompt.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WEBHOOK_URL = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/api/vapi-webhook`

// Fetch all tenant data needed to build the system prompt
async function fetchTenantData(tenantId) {
  const [tenantRes, servicesRes, partnerServicesRes, callRulesRes, partnersRes, specialtiesRes, staffRes, catalogueRes] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('id, business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, tone_register, business_outcome_type, custom_outcome_text, callback_preference_note, urgent_callback_mins, additional_instructions, subcategory_id, blocked_phone_numbers, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins')
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body
  const eventType = body.message?.type || body.type

  console.log('Vapi assistant-request event:', eventType)

  if (eventType !== 'assistant-request') {
    return res.status(200).json({ received: true })
  }

  const call         = body.message?.call || body.call
  const phoneNumberId = call?.phoneNumberId
  const toNumber      = call?.phoneNumber?.number

  // Look up tenant by Vapi phone number ID, then by the actual number
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

  const data = await fetchTenantData(tenantId)

  if (!data.tenant) {
    return res.status(200).json({
      error: { message: 'Business configuration not found.' },
    })
  }

  const systemPrompt = buildSystemPrompt(data)
  const analysisPlan = buildAnalysisPlan()
  const greeting     = data.tenant.greeting_message
    || `Good morning, you're through to ${data.tenant.business_name}. How can I help?`

  return res.status(200).json({
    assistant: {
      name: `Qerxel — ${data.tenant.business_name}`,
      firstMessageMode: 'assistant-speaks-first',
      firstMessage: greeting,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.4,
      },
      voice: {
        provider: 'deepgram',
        voiceId: 'aura-stella-en',
      },
      analysisPlan,
      serverUrl: WEBHOOK_URL,
      serverMessages: ['end-of-call-report'],
      endCallFunctionEnabled: true,
      endCallMessage: 'Thanks for calling. Goodbye.',
    },
  })
}
